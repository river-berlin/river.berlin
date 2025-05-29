---
shortSummary: Why I like Svelte more than React (it's store management)
author: River / Aditya Shankar
dated: 2025-05-24
title: Why I like Svelte more than React (it's store management)
icon: icon.jpg
url: why-i-like-svelte-more-than-react
---

## Why I like Svelte more than React (it's store management)

The developer experience of svelte is miles better than react, apart from pre-planned request layout structures and less cognitive work on that area

This is due to the fact that react by default does not have any "stores" by default, so unless you are relying on libraries mentioned below – you likely will have to create a huge amount of inheritance and prop-drilling - which quickly gets messy and becomes a maintenance nightmare

for example, lets say you have a simple react function with children

```tsx
function App() {
    return (
        <div>
            <h1>App</h1>
            <Child />
        </div>
    )
}

function Child() {
    return (
        <div>
            <h2>Child</h2>
        </div>
    )
}
```

and the way you use it is

```tsx
function App() {
    const [count, setCount] = useState(0)
    return (
        <div>
            <h1>App</h1>
            <Child count={count} setCount={setCount} />
        </div>
    )
}
```


now imagine doing this for a complex state driven project, it clearly doesn't work

```tsx
function App() {
    const [count, setCount] = useState(0)
    const [place, setPlace] = useState("alaska")
    const [name, setName] = useState("river")
    // 30 different states to load from
    
    // 30 different props to pass down
    <UserRepresentation count={count} setCount={setCount}, place={place} setPlace={setPlace}, name={name} setName={setName} />
}
```

This is probably not a "realistic" example, but in a practical sense, it is a nightmare to manage

So people turn to other libraries like zustand

here you use something similar to



```tsx
import { create } from 'zustand'

const useBearStore = create((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
}))

function BearCounter() {
  const bears = useBearStore((state) => state.bears)
  return <h1>{bears} around here ...</h1>
}

function Controls() {
  const increasePopulation = useBearStore((state) => state.increasePopulation)
  return <button onClick={increasePopulation}>one up</button>
}
``` 

This is indeed better, since it makes the stores "global" instead of something chained down

And that's it, React projects get into state-hell very easily, and then users are forced to use alternative options such as https://github.com/pmndrs/zustand or https://jotai.org/

Svelte manages this via svelte stores, which I feel are alot alot more intuitive, and because they come pre-packaged in svelte, it is one less additional library to use

```svelte
import {writable} from 'svelte/store'

let count = writable(0)

function increment() {
    count.update((value) => value + 1)
}
```

and when using them in html, you can use the $ prefix to access the store

```svelte
<h1>{$count}</h1>
<button on:click={increment}>Increment</button>
```

that's it, ta-da!

To be honest, I do like jot-ai atoms which come close to this, but I didn't enjoy having to learn jot-ai to use it, and I don't enjoy the "useAtom" syntax

Here's an example of jot-ai atoms for completeness's sake

```tsx
import { atom } from "jotai"

const countAtom = atom(0)

function increment() {
    countAtom.update((value) => value + 1)
}
```

to use this in a react component

```tsx
import { useAtom } from "jotai"

function App() {
    const [count, setCount] = useAtom(countAtom)
    return (
        <div>
            <h1>{count}</h1>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    )
}
````


