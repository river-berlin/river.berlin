<style>
.full-page{
    width: 100%;
    display: inline-block;
}

.main-text{
    margin: auto;
    margin-top: 60px;
    width: max-content;
    font-size: 40px;
    color: rgb(0, 0, 0);
    font-family: "Bad Script", cursive;
    font-weight: 400;
    font-style: normal;
    text-decoration: underline;
    text-decoration-style: wavy;
    text-decoration-color: rgb(9, 121, 83);
    text-align: center;
}

.m{
    color: rgb(0, 0, 0);
    font-family: "Bad Script", cursive;
    font-weight: 600;
    font-style: normal;
}

.m.blue-bolder{
    color: rgb(43, 144, 226);
}

.time-recorded{
    margin: auto;
    text-decoration: none;
    text-align: center;
    font-size: 40px;
}
</style>

<script>
    let m;
    let audio;
    let audioStuff;
    let mPressed = false;
    let audioChunks = []
    let mediaRecorder;
    let recordStartTime = Date.now();
    let audioExists = false;
    $: timeRecorded = 0;

    async function onRecordStart(){
        recordStartTime = Date.now()
        
        const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();

        mediaRecorder.onstart = e => {
            console.log(mediaRecorder.state);
        }

        mediaRecorder.ondataavailable = (e) => {
                audioChunks.push(e.data);
                console.log(mediaRecorder.state);
                console.log("recorder started");
        };

        recordStartTime = Date.now();
    }

    function onRecordStop(){
        let currAudioChunks = audioChunks;
        audioChunks = [];

        const blob = new Blob(currAudioChunks, { type: "audio/ogg; codecs=opus" });
        const audioURL = window.URL.createObjectURL(blob);
        audio.src = audioURL;

        audioExists = true;
        audio.addEventListener("canplaythrough", () => {
            audio.play()
        })
    }

    async function onKeyDown(e) {
        if(e.keyCode == 77){
            if(mPressed == false){
                mPressed = true;
                onRecordStart();
            } else {
                timeRecorded = Number.parseInt((Date.now() - recordStartTime)/1000)
            }
        }
	}

    function onKeyUp(e) {
        if(e.keyCode == 77){
            mPressed = false;
        }

        if(mediaRecorder){
            mediaRecorder.stop()
            mediaRecorder.addEventListener('stop', onRecordStop)
        }
    }
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bad+Script&display=swap" rel="stylesheet">
</svelte:head>


<svelte:window on:keydown|preventDefault={onKeyDown} on:keyup|preventDefault={onKeyUp}/>

<div class="full-page">
    <div class="main-text">
        {#if mPressed}
            Release <span class="m blue-bolder" bind:this={m}>M</span> to play audio
        {:else}
            Press <span class="m" bind:this={m}>M</span> to record audio
        {/if}

        <div class="audio-stuff" bind:this={audioStuff}>
            <!-- svelte-ignore a11y-media-has-caption -->
            <audio bind:this={audio}></audio>
        </div>
    </div>

    {#if mPressed}
        <br><p class="time-recorded">{timeRecorded}</p>
    {/if}
</div>
