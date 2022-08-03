var canvas = document.getElementById("canvas");
var g = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
console.log(params);

var requestedFullscreen = false;
function mobileFullscreen()
{
  if(requestedFullscreen)
  {
    return;
  }

  if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
    document.body.requestFullscreen().then(() => requestedFullscreen = true);
  }
}

var ROOT = parseInt(params.root ?? 0) - 33; //0 and increments of 12 are "C"s
var STEP = parseInt(params.step ?? 5);
var N_STRINGS = parseInt(params.strings ?? 4);
var STRINGS = new Array(N_STRINGS).fill(0).map((e, i) => ROOT + i * STEP);
var N_FRETS = parseInt(params.frets ?? 12);
var SYNTH_TYPE = params.synth ?? "triangle"
var LOOKAHEAD = parseFloat(params.lookahead ?? 0.01);

Tone.getContext().lookAhead = LOOKAHEAD;

var WHITES = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0]; //starting at A

var SW = () => window.innerWidth / STRINGS.length;
var FH = () => window.innerHeight / N_FRETS;

function mod(n, m)
{
  return ((n % m) + m) % m;
}

//TODO: polysynth? can we index the poly notes by touch id?

canvas.addEventListener("touchstart", (e) => {
  Array.from(e.changedTouches).forEach((t) => onTouch(t.identifier, t.clientX, t.clientY));
});

canvas.addEventListener("mousedown", (e) => {
  if(e.button != 0)
  {
    return;
  }
  //TODO: fix touch tap issue
  // onTouch(-1);
});

canvas.addEventListener("touchend", (e) => {
  Array.from(e.changedTouches).forEach((t) => onRelease(t.identifier, t.clientX, t.clientY));
});

canvas.addEventListener("mouseup", (e) => {
  if(e.button != 0)
  {
    return;
  }
  //TODO: fix touch tap issue
  // onRelease(-1);
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  Array.from(e.changedTouches).forEach((t) => onMove(t.identifier, t.clientX, t.clientY));
});
//TODO: mousemove

//disable touch and hold/right click
canvas.addEventListener("contextmenu", function(e) { e.preventDefault(); })

function createSynth()
{
  return new Tone.Synth({
    oscillator: {
      type: SYNTH_TYPE
    }
  }).toDestination();
}

var touches = {};

function calcFreq(string, y)
{
  //determine semitone above string
  var fret = (1 - y / window.innerHeight) * N_FRETS;
  //exponential note formula starting at string root note
  return 440 * Math.pow(2, (STRINGS[string] + fret - 0.5) / 12);
}

function onTouch(id, x, y)
{
  mobileFullscreen();

  Tone.context.resume();

  //determine string
  var string = Math.floor(x / SW());
  string = Math.max(0, Math.min(string, STRINGS.length - 1));
  var freq = calcFreq(string, y);

  //create synth and play note
  var synth = createSynth();
  synth.triggerAttack(freq);
  touches[id] = {string, synth};
}

function onRelease(id, x, y)
{
  var {synth, string} = touches[id];
  // console.log("released", id);
  synth.onsilence = (synth) => {
    console.log(id, "silenced");
    synth.disconnect();
    synth.dispose();
  };

  synth.triggerRelease();
}

function onMove(id, x, y)
{
  //TODO: determine volume by distance from center of string
  var {synth, string} = touches[id];
  let freq = calcFreq(string, y);
  synth.setNote(freq);
}

function render()
{
  g.clearRect(0, 0, canvas.width, canvas.height);

  STRINGS.forEach((e, i) => {
    var x1 = i * SW();
    var x2 = (i + 1) * SW();

    var grd = g.createLinearGradient(x1, 0, x2, 0);
    grd.addColorStop(0, "black");
    grd.addColorStop(0.5, "#8888ff");
    grd.addColorStop(1, "black");

    g.lineWidth = 3;
    g.fillStyle = grd;

    g.fillRect(x1, 0, SW(), canvas.height);

    for(var j = 0; j < N_FRETS; j++)
    {
      var note = STRINGS[i] + j;
      var isWhite = WHITES[mod(note, 12)]; //+8 to go from a to c lol
      var isC = mod(note - 3, 12) == 0;
      var y1 = j * FH();
      var y2 = (j + 1) * FH();

      var color =
        isC ? "rgba(0, 255, 0, 0.25)" :
        isWhite ? "rgba(255, 255, 255, 0.25)" :
        "rgba(0, 0, 0, 0.25)";

      g.fillStyle = color;
      g.fillRect(x1, canvas.height-y2, SW(), FH());
      g.strokeRect(x1, canvas.height-y2, SW(), FH());
    }
  })

  // requestAnimationFrame(render);
}

render();
