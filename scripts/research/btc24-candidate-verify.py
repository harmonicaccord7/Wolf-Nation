"""Independent NumPy/scikit-learn reconstruction; files and fits stay private."""
import json,sys,hashlib
from datetime import datetime
from pathlib import Path
import numpy as np
import scipy
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss,log_loss,accuracy_score

record,evidence=[json.load(open(p)) for p in sys.argv[1:3]]
snapshot=record['snapshot']; result=evidence['result']
assert evidence['protocolHash']=='83ebf4a4767288ed62241f12acca9a4b83442175230f6bfe122b8964265c11b3'
assert record['recordId']==evidence['snapshotId']
assert snapshot['hash']==evidence['snapshotHash']=='b9da28a6fccde64b3fd3084e4d17ca8e351aba3c7e3360d5d43ee67a611fdc76'
assert hashlib.sha256(json.dumps(snapshot['candles'],separators=(',',':')).encode()).hexdigest()==snapshot['hash']
protocol=json.loads((Path(__file__).resolve().parents[2]/'research/btc24/v0.2/protocol.json').read_text())
assert hashlib.sha256(json.dumps(protocol,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()==evidence['protocolHash']
assert snapshot['fetchedAt']==protocol['source']['fetchedAt'] and snapshot['provider']==protocol['source']['provider'] and snapshot['sourceUrl']==protocol['source']['url']
c=np.array(snapshot['candles'],dtype=float)
assert len(c)==3541 and np.all(np.diff(c[:,0])==86400)
x,y,starts,ends,cutoffs=[],[],[],[],[]
for i in range(30,len(c)-2):
    changes=np.diff(np.log(c[i-30:i+1,4]))
    x.append([np.log(c[i,4]/c[i-n,4]) for n in [1,3,7,14]]+[np.std(changes[-7:]),np.std(changes),np.log(c[i,2]/c[i,1]),np.log(np.mean(c[i-6:i+1,5])/np.mean(c[i-29:i+1,5]))])
    y.append(int(c[i+2,4]>c[i+2,3]));starts.append(c[i+2,0]);ends.append(c[i+2,0]+86400);cutoffs.append(c[i,0]+86400)
x,y,starts,ends,cutoffs=map(np.asarray,[x,y,starts,ends,cutoffs])
epoch=lambda s:datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
expected=(starts>=epoch('2024-01-01T00:00:00Z'))&(ends<=epoch('2026-09-12T00:00:00Z'))
assert int(np.sum(expected))==len(result['rows'])==985
np.testing.assert_array_equal(starts[expected],[r['start'] for r in result['rows']])
max_coefficient_error=0.0;max_probability_error=0.0
def audit_fit(mask,stored,penalty):
    global max_coefficient_error
    assert int(mask.sum())>=500
    means,scales=x[mask].mean(axis=0),x[mask].std(axis=0)
    scales=np.where(scales==0,1,scales)
    np.testing.assert_allclose(means,stored['means'],atol=1e-12,rtol=1e-12)
    np.testing.assert_allclose(scales,stored['scales'],atol=1e-12,rtol=1e-12)
    estimator=LogisticRegression(C=1/penalty,solver='lbfgs',tol=1e-12,max_iter=3000)
    estimator.fit((x[mask]-means)/scales,y[mask])
    coefficients=np.r_[estimator.intercept_,estimator.coef_[0]]
    np.testing.assert_allclose(coefficients,stored['coefficients'],atol=2e-6,rtol=0)
    assert abs(y[mask].mean()-stored['prior'])<1e-12
    assert int(mask.sum())==stored['observations'] and ends[mask].max()==stored['lastTargetEnd']
    max_coefficient_error=max(max_coefficient_error,float(np.max(np.abs(coefficients-np.array(stored['coefficients'])))))
    return estimator,means,scales
for fold,old in zip(result['folds'],result['legacyFolds'],strict=True):
    cutoff=epoch(fold['cutoff']);lower=cutoff-730*86400
    assert cutoff==epoch(fold['start'])-86400
    mask=(ends<cutoff)&(ends>=lower)
    assert ends[mask].min()==epoch(fold['trainingFirstTargetEnd']) and ends[mask].max()==epoch(fold['trainingLastTargetEnd'])
    estimator,means,scales=audit_fit(mask,fold['model'],100)
    legacy_estimator,legacy_means,legacy_scales=audit_fit(ends<cutoff,old['model'],10)
    rows=[r for r in result['rows'] if r['fold']==fold['key']]
    assert len(rows)==fold['observations']==old['observations']
    indices=np.array([np.where(starts==r['start'])[0][0] for r in rows])
    np.testing.assert_allclose(x[indices],[r['x'] for r in rows],atol=1e-12,rtol=1e-12)
    np.testing.assert_array_equal(y[indices],[r['y'] for r in rows])
    target_indices=np.array([np.where(c[:,0]==r['start'])[0][0] for r in rows])
    np.testing.assert_array_equal(c[target_indices,3],[r['open'] for r in rows])
    np.testing.assert_array_equal(c[target_indices,4],[r['close'] for r in rows])
    assert all(r['start']-r['cutoff']==86400 and r['end']-r['start']==86400 for r in rows)
    probabilities=estimator.predict_proba((x[indices]-means)/scales)[:,1]
    legacy_probabilities=legacy_estimator.predict_proba((x[indices]-legacy_means)/legacy_scales)[:,1]
    np.testing.assert_allclose(probabilities,[r['probability'] for r in rows],atol=2e-6,rtol=0)
    np.testing.assert_allclose(legacy_probabilities,[r['legacyProbability'] for r in rows],atol=2e-6,rtol=0)
    assert all(abs(r['baseline']-y[ends<cutoff].mean())<1e-12 and abs(r['rollingPrior']-y[mask].mean())<1e-12 for r in rows)
    max_probability_error=max(max_probability_error,float(np.max(np.abs(probabilities-np.array([r['probability'] for r in rows])))))
audit_fit((ends<epoch(result['finalFit']['cutoff']))&(ends>=epoch(result['finalFit']['cutoff'])-730*86400),result['fittedFinal'],100)
audit_fit(np.ones(len(x),dtype=bool),result['legacyFittedFinal'],10)
rows=result['rows'];labels=np.array([r['y'] for r in rows])
probabilities={name:np.array([r[key] for r in rows]) for name,key in [('candidate','probability'),('legacy','legacyProbability'),('benchmark','baseline'),('rollingPrior','rollingPrior')]}
def audit_metrics(labels,p,stored):
    assert abs(brier_score_loss(labels,p)-stored['brier'])<1e-12
    assert abs(log_loss(labels,p,labels=[0,1])-stored['logLoss'])<1e-12
    assert abs(accuracy_score(labels,p>=.5)-stored['hitRate'])<1e-12
    positives=p>=.5
    if positives.any():assert abs(labels[positives].mean()-stored['precision'])<1e-12
    else:assert stored['precision'] is None
    assert len(p)==stored['observations'] and abs(labels.mean()-stored['actualUpRate'])<1e-12
    for i,bin in enumerate(stored['reliability']):
        mask=np.minimum(9,np.floor(p*10))==i
        assert int(mask.sum())==bin['count']
        if mask.any():assert abs(p[mask].mean()-bin['predicted'])<1e-12 and abs(labels[mask].mean()-bin['observed'])<1e-12
        else:assert bin['predicted'] is None and bin['observed'] is None
for name,p in probabilities.items():audit_metrics(labels,p,result['metrics'][name])
for q in result['quarters']:
    mask=np.array([r['fold']==q['key'] for r in rows])
    for name in ['candidate','legacy','benchmark']:audit_metrics(labels[mask],probabilities[name][mask],q[name])
def interval(other):
    differences=(probabilities['candidate']-labels)**2-(other-labels)**2
    state=241017;draws=[]
    for repeat in range(1000):
        total=0.0;count=0
        while count<len(rows):
            state=(1664525*state+1013904223)&0xffffffff;start=int(state/4294967296*len(rows))
            for j in range(14):
                if count==len(rows):break
                total+=differences[(start+j)%len(rows)];count+=1
        draws.append(total/len(rows))
    draws.sort();return float(differences.mean()),draws[25],draws[975]
for name,other in [('versusLegacy',probabilities['legacy']),('versusBenchmark',probabilities['benchmark'])]:
    values=interval(other);stored=result['differences'][name]
    np.testing.assert_allclose(values,[stored['difference'],stored['lower95'],stored['upper95']],atol=1e-12,rtol=0)
moves=np.array([r['close']/r['open']-1 for r in rows])
def audit_strategy(active,cost,stored):
    net=np.where(active,(1-cost)*(1+moves)*(1-cost)-1,0)
    wealth=np.cumprod(1+net);drawdown=1-wealth/np.maximum.accumulate(np.r_[1,wealth])[1:]
    assert abs((wealth[-1]-1)*100-stored['totalReturnPct'])<1e-8
    assert abs(drawdown.max()*100-stored['maxDrawdownPct'])<1e-8
    assert int(active.sum())==stored['activeDays']
    assert abs(net.mean()*100-stored['averageDayReturnPct'])<1e-10
for case in result['strategies']:
    cost=case['costBpsPerSide']/10000
    for name,active in [('candidate',probabilities['candidate']>=.55),('legacy',probabilities['legacy']>=.55),('alwaysLongDaily',np.ones(len(rows),dtype=bool)),('momentum',np.array([r['x'][0]>0 for r in rows])),('cash',np.zeros(len(rows),dtype=bool))]:audit_strategy(active,cost,case[name])
    wealth=(1-cost)*np.array([r['close'] for r in rows])/rows[0]['open'];wealth[-1]*=1-cost
    drawdown=1-wealth/np.maximum.accumulate(np.r_[1,wealth])[1:]
    assert abs((wealth[-1]-1)*100-case['buyHold']['totalReturnPct'])<1e-8 and abs(drawdown.max()*100-case['buyHold']['maxDrawdownPct'])<1e-8
assert result['gate']['forwardCallsIssued']==0 and result['gate']['publication']=='blocked' and not result['gate']['automaticPromotion']
print(json.dumps({'verified':True,'numpy':np.__version__,'scipy':scipy.__version__,'sklearn':sklearn.__version__,'targets':len(rows),'candidate_fits':len(result['folds'])+1,'legacy_fits':len(result['legacyFolds'])+1,'max_coefficient_absolute_error':max_coefficient_error,'max_probability_absolute_error':max_probability_error,'checks':['independent features/labels','strict rolling/purged training windows','training-only scaling','scikit-learn fits','paired probability and quarter metrics','calibration','paired block bootstrap','all fixed costs/strategies','no automatic promotion']},indent=2))
