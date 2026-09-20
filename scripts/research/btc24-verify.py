"""Independent NumPy/scikit-learn audit; input files remain private.
python scripts/research/btc24-verify.py private-snapshot.json private-result.json
"""
import json, sys
import numpy as np
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, accuracy_score

snapshot, evidence = [json.load(open(p)) for p in sys.argv[1:3]]
c = np.array(snapshot['candles'], dtype=float)
assert np.all(np.diff(c[:, 0]) == 86400), 'Unexpected gap'
x, y, starts, ends, cutoffs = [], [], [], [], []
for i in range(30, len(c) - 2):
    changes = np.diff(np.log(c[i-30:i+1, 4]))
    x.append([np.log(c[i, 4]/c[i-n, 4]) for n in [1, 3, 7, 14]] + [np.std(changes[-7:]), np.std(changes), np.log(c[i, 2]/c[i, 1]), np.log(np.mean(c[i-6:i+1, 5])/np.mean(c[i-29:i+1, 5]))])
    y.append(int(c[i+2, 4] > c[i+2, 3]))
    starts.append(c[i+2, 0]); ends.append(c[i+2, 0] + 86400); cutoffs.append(c[i, 0] + 86400)
x, y, starts, ends, cutoffs = map(np.asarray, [x, y, starts, ends, cutoffs])

def audit_fit(mask, stored):
    means, scales = np.mean(x[mask], axis=0), np.std(x[mask], axis=0)
    np.testing.assert_allclose(means, stored['means'], atol=1e-12)
    np.testing.assert_allclose(scales, stored['scales'], atol=1e-12)
    estimator = LogisticRegression(C=.1, solver='lbfgs', tol=1e-12, max_iter=3000)
    estimator.fit((x[mask]-means)/scales, y[mask])
    coefficients = np.r_[estimator.intercept_, estimator.coef_[0]]
    np.testing.assert_allclose(coefficients, stored['coefficients'], atol=2e-6, rtol=0)
    return float(np.max(np.abs(coefficients-np.array(stored['coefficients']))))

result = evidence['result']
max_error = audit_fit(np.ones(len(x), dtype=bool), result['fittedFinal'])
from datetime import datetime
epoch = lambda s: datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()
for fold in result['test']['folds']:
    cutoff = epoch(fold['start']) - 86400
    assert epoch(fold['trainingLastTargetEnd']) < cutoff
    max_error = max(max_error, audit_fit(ends < cutoff, fold['model']))

rows = result['test']['rows']
for row in rows:
    index = int(np.where(starts == row['start'])[0][0])
    np.testing.assert_allclose(x[index], row['x'], atol=1e-12)
    assert y[index] == row['y'] and row['start']-row['cutoff'] == 86400
    assert row['end']-row['start'] == 86400
probabilities = np.array([r['probability'] for r in rows])
labels = np.array([r['y'] for r in rows])
assert abs(brier_score_loss(labels, probabilities)-result['test']['model']['brier']) < 1e-12
assert abs(log_loss(labels, probabilities)-result['test']['model']['logLoss']) < 1e-12
assert abs(accuracy_score(labels, probabilities >= .5)-result['test']['model']['hitRate']) < 1e-12
moves = np.array([r['close']/r['open']-1 for r in rows])
for s in result['test']['strategies']:
    cost = s['costBpsPerSide']/10000
    net = np.where(probabilities >= .55, (1-cost)*(1+moves)*(1-cost)-1, 0)
    wealth = np.cumprod(1+net)
    drawdown = 1-wealth/np.maximum.accumulate(np.r_[1, wealth])[1:]
    assert abs((wealth[-1]-1)*100-s['model']['totalReturnPct']) < 1e-9
    assert abs(np.max(drawdown)*100-s['model']['maxDrawdownPct']) < 1e-9
    assert abs(np.mean(net)*100-s['model']['averageDayReturnPct']) < 1e-10
print(json.dumps({'verified': True, 'numpy': np.__version__, 'sklearn': sklearn.__version__, 'independent_fits': len(result['test']['folds'])+1, 'holdout_rows_checked': len(rows), 'max_coefficient_absolute_error': max_error, 'checks': ['independent features/labels', 'training-only scaler', 'purged chronological folds', 'scikit-learn fit', 'Brier/log-loss/accuracy', 'costs/returns/drawdown']}, indent=2))
