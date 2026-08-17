---
shortSummary: Testing out TabPFN on palmer penguins
summary: Here, I test out TabPFN on the palmer penguins dataset - and then do a small technical breakdown on how the TabPFN dataset actually works
author: River / Aditya Shankar
dated: 2026-08-17
title: How many Penguins can TabPFN classify correctly?
icon: icon.jpg
icon_v2: true
iconCredit: Thomas Denton
iconCreditUrl: https://unsplash.com/de/fotos/pinguin-steht-tagsuber-auf-braunem-felsen-pjt4AzvfTh0
url: tabpfn-penguins
---

authors note : yeah I know the Northern Rockhopper Penguin (icon) isn't on the palmer penguins dataset, it just looks really cool lol, it looks like a mad scientist penguin - my kinda penguin!

-------

# How many penguins can TabPFN classify correctly?

[TabPFN](https://en.wikipedia.org/wiki/TabPFN) is a supervised classification/regression analysis dataset that focuses on tabular datasets (focusing on small-to-medium datasets), the paper claims SOTA performance, in this article I test out TabPFNs accuracy on the palmer penguins dataset, and give a basic explaination of how it works.


## Testing it out on the Palmer penguins dataset

The [palmer penguins dataset](https://allisonhorst.github.io/palmerpenguins/) is a dataset on penguins and some of the lengths of the "features" of those penguins

from their documentation, a basic look at their features shows this

```r
str(penguins)
#> tibble [344 × 8] (S3: tbl_df/tbl/data.frame)
#>  $ species          : Factor w/ 3 levels "Adelie","Chinstrap",..: 1 1 1 1 1 1 1 1 1 1 ...
#>  $ island           : Factor w/ 3 levels "Biscoe","Dream",..: 3 3 3 3 3 3 3 3 3 3 ...
#>  $ bill_length_mm   : num [1:344] 39.1 39.5 40.3 NA 36.7 39.3 38.9 39.2 34.1 42 ...
#>  $ bill_depth_mm    : num [1:344] 18.7 17.4 18 NA 19.3 20.6 17.8 19.6 18.1 20.2 ...
#>  $ flipper_length_mm: int [1:344] 181 186 195 NA 193 190 181 195 193 190 ...
#>  $ body_mass_g      : int [1:344] 3750 3800 3250 NA 3450 3650 3625 4675 3475 4250 ...
#>  $ sex              : Factor w/ 2 levels "female","male": 2 1 1 NA 1 2 1 2 NA NA ...
#>  $ year             : int [1:344] 2007 2007 2007 2007 2007 2007 2007 2007 2007 2007 ...
```

I've installed TabPFN as [described in the tabpfn documentation](https://docs.priorlabs.ai/quickstart) (note : you've to accept their license and export the reqired environmental variables before usage) and Palmer penguins with a simple `pip install palmerpenguins`

Note : The colab notebook where I am trying this out is available [here](https://colab.research.google.com/drive/1U_VIAT06uLhpYeZdcAcIiLf2q5SmngGn?usp=sharing)


The interface to access TabPFN is the same as most sklearn models, easy to import

```py
import numpy as np
from palmerpenguins import load_penguins
from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingClassifier
from tabpfn import TabPFNClassifier
```

load the dataset, appropriately assign the features and the target variable

```py
df = load_penguins().dropna(subset=["species"])
y = df["species"]
X = df.drop(columns=["species"])
for c in ["island", "sex"]:
    X[c] = X[c].astype("category").cat.codes.replace(-1, np.nan)
```

setup a nice train test split

```py
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y)
n = len(X_te)
```

and predict the output code to test out the accuracy

```py
clf = TabPFNClassifier().fit(X_tr, y_tr)
print(f"Accuracy of TabPFN - {(clf.predict(X_te) == y_te).sum()}/{n}")
```

on a bonus, the interface is really neat and straightforward, anyone with proir sklearn experience is going to grab on this instantly

and one gets 104/104 which....doesn't tell us much, but when I push lower and test this out on lower values and compare this against a historical gradient boosting classifier

with 
```py
for k in [10, 20, 40, 80, 160]:
    Xs, ys = train_test_split(X_tr, y_tr, train_size=k, stratify=y_tr)[::2]
    t = (TabPFNClassifier().fit(Xs, ys).predict(X_te) == y_te).sum()
    g = (HistGradientBoostingClassifier().fit(Xs, ys).predict(X_te) == y_te).sum()
    print(f"{k:>3} penguins  TabPFN {t}/{n}  GBM {g}/{n}")
```

I get

```
 10 penguins  TabPFN 102/104  GBM 46/104
 20 penguins  TabPFN 103/104  GBM 46/104
 40 penguins  TabPFN 104/104  GBM 91/104
 80 penguins  TabPFN 104/104  GBM 102/104
160 penguins  TabPFN 104/104  GBM 104/104
```

oh yeah, much better, TabPFN can instantly understand penguins 

# So what is TabPFN anyway

so the [TabPFN 3 archiv article](https://arxiv.org/pdf/2605.13986) gets nicely into how TabPFN behaves

![TabPFN3 archiv article](/blog/blog-20/tabpfn_architecture.png)


okay here's a more simple explaination to how this model really works

So the model does "in-context" learning, unlike other things it's not really truly "trained" on the data, it sorta observes the data and produces an answer.

The model is a transformer model (they also do have a "thinking variant", I suspect thinking means something different in this context as to what it means with LLMs, the paper doesn't get into what thinking mode really is)


When you are doing inference, it essentially converts all the values into a vector, and then the transformer compares the rows against each other (and this reduces the amount of computational time, since technically everything is looking at "one vector")


but that's basically it, 

there are some more neat tricks that it uses (that you can read more about in their paper https://arxiv.org/pdf/2605.13986), like row chunking to classify multiple rows at the same time, some neat KV cache optimization tricks

but, really, the underlying architecture is so beautiful and simple - and very effective

### Effectiveness

They've some details of proof, it seems to do better on causal inference

on the tabarena leaderboard

![TabArena leaderboard](/blog/blog-20/tabarena_leaderboard.png) the model does seem to produce state of the art of an ELO

on the TALENT benchmark

![Talent Benchmark](/blog/blog-20/talent_benchmark.png)


I am to be honest, a little blown away by how such a simple model performs so effectively
