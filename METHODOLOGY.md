# Redistricting Mathematics & Methodology

This document provides an in-depth technical breakdown of the algorithms, statistical formulas, and computational models used to generate and evaluate the redistricting maps in the **RedrawUS** project.

---

## 1. The ReCom (Recombination) Algorithm

At the core of our map generation is the **Markov Chain Monte Carlo (MCMC)** method using the **ReCom (Recombination)** algorithm, developed by the [Metric Geometry and Gerrymandering Group (MGGG)](https://mggg.org/). 

Instead of moving single precincts (which leads to jagged, non-compact districts), ReCom operates on macro-level tree structures to ensure contiguous, highly compact districts with equal populations.

### How it Works
1. **Select**: Choose two adjacent districts.
2. **Merge**: Combine them into one large region.
3. **Graph**: Build a spanning tree of all census blocks/precincts within the region.
4. **Cut**: Randomly cut a single edge in the spanning tree that divides the population into two equal pieces (within a $\pm 1\%$ tolerance).
5. **Yield**: Accept the new map and repeat the process to build a massive "ensemble" of valid maps.

### Python Implementation (GerryChain)
```python
from gerrychain import MarkovChain, constraints, accept
from gerrychain.proposals import recom

# Configure the ReCom proposal
proposal = partial(
    recom,
    pop_col="POP10",
    pop_target=ideal_population,
    epsilon=0.01,  # 1% population deviation tolerance
    node_repeats=1
)

# Run the Markov Chain Simulator
chain = MarkovChain(
    proposal=proposal,
    constraints=[
        constraints.is_contiguous,
        constraints.within_percent_of_ideal_population(initial_partition, 0.01)
    ],
    accept=accept.always_accept,
    initial_state=initial_partition,
    total_steps=10000
)
```

---

## 2. Partisan Bias (Efficiency Gap)

The **Efficiency Gap (EG)** is a standard measure of partisan gerrymandering that calculates the difference in "wasted votes" between two parties. 
- A vote is "wasted" if it is cast for a losing candidate, or if it is cast for a winning candidate *in excess* of the 50% needed to win.

### Formula
$$EG = \frac{\text{Wasted Votes}_{Dem} - \text{Wasted Votes}_{Rep}}{\text{Total Votes}}$$

A value of **0%** means both parties wasted the same number of votes (perfect partisan symmetry). A highly negative value indicates Republican bias (Democrat votes are packed/cracked), and a highly positive value indicates Democratic bias.

### JavaScript Evaluation
The frontend dynamically calculates the visual partisan bias based on this metric:
```javascript
// DataService.js
calculateEfficiencyGapColor(egValue) {
    // 0 is perfectly neutral, negative favors Republican, positive favors Democrat
    if (Math.abs(egValue) < 0.03) return '#cbd5e1'; // Neutral/Fair
    
    if (egValue > 0) {
        // Democratic Bias (Blue)
        if (egValue > 0.15) return '#1e40af'; // Extreme Safe D
        if (egValue > 0.08) return '#3b82f6'; // Lean D
        return '#93c5fd'; // Slight D
    } else {
        // Republican Bias (Red)
        if (egValue < -0.15) return '#991b1b'; // Extreme Safe R
        if (egValue < -0.08) return '#ef4444'; // Lean R
        return '#fca5a5'; // Slight R
    }
}
```

---

## 3. Compactness (Polsby-Popper Score)

The **Polsby-Popper** score evaluates district compactness by comparing a district's area to the area of a circle with the same perimeter. 

### Formula
$$PP = \frac{4\pi \times \text{Area}}{\text{Perimeter}^2}$$
Values range from `0` (infinitely infinitely jagged/gerrymandered) to `1` (a perfect circle).

```python
# GerryChain calculates this automatically via updaters
from gerrychain.updaters import Tally, cut_edges
import math

def calculate_polsby_popper(partition):
    scores = {}
    for district, geom in partition["geometry"].items():
        area = geom.area
        perimeter = geom.length
        scores[district] = (4 * math.pi * area) / (perimeter ** 2)
    return scores
```

---

## 4. Mean-Median Difference

This metric compares a party's *average* (mean) vote share across all districts to its *median* district vote share. 
If a party's median is significantly lower than its mean, it indicates that the party's voters are heavily "packed" into a few blowout districts, making it harder for them to win a majority of seats.

### Mathematical Definition
$$MMD = \text{Mean Vote Share} - \text{Median Vote Share}$$

---

## 5. Voting Rights Act (VRA) / Minority Representation

The Voting Rights Act often requires the creation of districts where minority groups have the opportunity to elect a candidate of choice. We track two thresholds:
- **Majority-Minority Districts:** Districts where a specific minority group exceeds **50%** of the Voting Age Population (VAP).
- **Influence Districts:** Districts where a specific minority group exceeds **30%** of the VAP, allowing them to heavily influence primary and general elections.

### Code Snippet (Python VRA Tally)
```python
def count_vra_districts(partition, minority_pop_col, total_pop_col):
    majority_count = 0
    influence_count = 0
    
    for district in partition.parts:
        minority_pop = partition[minority_pop_col][district]
        total_pop = partition[total_pop_col][district]
        
        share = minority_pop / total_pop if total_pop > 0 else 0
        
        if share >= 0.50:
            majority_count += 1
        elif share >= 0.30:
            influence_count += 1
            
    return majority_count, influence_count
```

---

## 6. County Splits (Preserving Communities of Interest)

A fundamental rule of traditional redistricting is to preserve political subdivisions (like counties and municipalities). The algorithm tracks "county splits" by counting the number of times a single county is divided between multiple congressional districts. Lower numbers indicate a cleaner, more localized map.
