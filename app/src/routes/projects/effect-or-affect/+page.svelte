<script>
    let showModal = false;

    let affectSentences = [
        "The fireplace affected the vibe in the room, to be more mellow",
        "The dinosaur medicine will affect the dinosaur in 2 hours",
        "Knowledge of the burden of responsibility affects her actions strongly",
        "Dunham was crying quietly beside me, and all the men were affected by the piteous cries",
        "That man's demeanor was not affected by the fog",
        "The woman's crazy dance moves affected her boyfriend strongly; he later married her"
    ]

    let effectSentences = [
        "She felt the effect of the mind crystals",
        "Francisco The Divine Elephant's victory had a strong effect on her personality thereafter",
        "The new vegan penguin cheese had a great effect on the taste of the pizza",
        "She kissed her, and it had the effect of turning them both into unicorns - from horses",
        "Martin the German-Ethiopian Penguin's affectionate gesture of giving Leela a rock effected her self esteem",
        "The magical divine smell had no effect on anybody; it was a placebo; "
    ]

    let affectExceptionSentences = [

    ]

    let effectExceptionSentences = [

    ]

    const totalSentences = []

    for (let sentence of affectSentences){
        totalSentences.push({
            sentence : sentence.replace("affect", "______"),
            answer : 1
        })
    }

    for (let sentence of effectSentences){
        totalSentences.push({
            sentence : sentence.replace("effect", "______"),
            answer : 0
        })
    }

    function shuffle(array) {
        let currentIndex = array.length;

        // While there remain elements to shuffle...
        while (currentIndex != 0) {

            // Pick a remaining element...
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
        }
    }

    shuffle(totalSentences)

    let currSentenceNum = 0;
    let markedWrongAnswer = false;

    $ : sentence = totalSentences[currSentenceNum]

    function markAnswer(answerNum){

        // if the answer is incorrect
        if(answerNum != sentence.answer){
            markedWrongAnswer = true;
        } else {
            currSentenceNum += 1;
            markedWrongAnswer = false
        }
        return
    }
</script>



<div class="flex flex-col mx-auto justify-center items-center p-5 mt-20">

    <h1>Effect or Affect?</h1>
    <div class="flex flex-col justify-center items-center bg-white drop-shadow-md p-5 rounded w-64 h-80 border-solid border-2 border-black">
        <p class="text-xs text-center">{sentence.sentence}</p>
    
        <div class="w-full mt-5 flex absolute bottom-0 left-0">
            <input 
             class="grow cursor-pointer p-3 bg-white hover:bg-slate-100 rounded-tr-lg transition-colors duration-500" 
             type="button" 
             value="effect"
             on:click= {() => markAnswer(0)}
             />
            <input 
             class="grow cursor-pointer p-3 bg-white hover:bg-slate-100 rounded-tl-lg transition-colors duration-500" 
             type="button" 
             value="affect"
             on:click= {() => markAnswer(1)}
             />
        </div>
    </div>

    <div>
        {#if markedWrongAnswer}
            <p class="wrong-answer-prompt text-xs">Whoops!, lets try that again</p>
        {/if}
    </div>

    <div class="flex justify-center items-center mt-10 text-xs bg-white rounded-full h-min p-1 py-1" on:click={() => showModal = !showModal}>
        <span class="border-black border-solid border rounded-full h-5 w-5 inline-block text-center">i</span>
        <button class="text-xs bg-white rounded-full ml-2 pr-2">
            {#if !showModal}
                view definitions
            {:else}
                close definitions
            {/if}
            
        </button>
    </div>

    {#if showModal}
        <div class="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white border-2 p-2 rounded-lg border-black">
            <div class="flex">
                <div class="card rounded-box grid flex-grow place-items-center w-80 text-xs text-center">
                    <p class="font-bold">Effect</p>
                    <p>generally a noun, which indicates the result of a change</p>
                    <p>for example : The new law had a significant effect on the economy.</p>

                    <p>Exception</p>
                    <p>Effect can be a verb, which means to bring about some result, this genrally comes up with a noun like change or solutions as a direct object</p>
                </div>
                <div class="divider divider-horizontal"></div>
                <div class="card rounded-box grid flex-grow place-items-center w-80 text-xs text-center">
                    <p class="font-bold">Affect</p>
                    <p>Affect is generally a verb, that means to influence something, or bring a difference in it</p>
                    <p>for example : The weather can greatly affect your mood.</p>
                    <p>Exception</p>
                    <p>affect becomes a noun in the context of putting an act or pretending to feel a certain way </p>
                    <p>for example :  They affect an air of worldly cynicism.</p>
                </div>
            </div>
        </div>
    {/if}
</div>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shantell+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">

<style lang="postcss">
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    * {
        font-family: "Shantell Sans", cursive;
        font-optical-sizing: auto;
        font-style: normal;
        font-variation-settings:
          "BNCE" 0,
          "INFM" 0,
          "SPAC" 0;
      }
</style>
