// Set up basic variables for app
const record = document.querySelector(".record");
const stop = document.querySelector(".stop");
const soundClips = document.querySelector(".sound-clips");
const canvas = document.querySelector(".visualizer");
const mainSection = document.querySelector(".main-controls");
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Disable stop button while not recording
stop.disabled = true;

// Visualiser setup - create web audio api context and canvas
let audioCtx;
const canvasCtx = canvas.getContext("2d");

// Main block for doing the audio recording
if (navigator.mediaDevices.getUserMedia) {
  console.log("The mediaDevices.getUserMedia() method is supported.");

  const constraints = { audio: true };
  let chunks = [];

  let onSuccess = function (stream) {
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.mimeType = 'audio/webm;codecs="opus"';
    visualize(stream);

    record.onclick = function () {
      mediaRecorder.start();

      console.log(mediaRecorder.state);
      console.log("Recorder started.");
      record.style.background = "red";

      stop.disabled = false;
      record.disabled = true;

    };

    stop.onclick = function () {
      mediaRecorder.stop();
      console.log(mediaRecorder.state);
      console.log("Recorder stopped.");
      record.style.background = "";
      record.style.color = "";

      stop.disabled = true;
      record.disabled = false;
    };

    mediaRecorder.onstart = function (e) {
      console.log("media record onstart!");
      setTimeout(() => {
        mediaRecorder.stop();
        console.log(mediaRecorder.state);
        console.log("Recorder stopped.");
        record.style.background = "";
        record.style.color = "";
  
        stop.disabled = true;
        record.disabled = false;
      }, 5000);
    };

    mediaRecorder.onstop = function (e) {
      console.log("Last data to read (after MediaRecorder.stop() called).");

      const clipName = prompt(
        "Enter a name for your sound clip?",
        "My unnamed clip"
      );

      const clipContainer = document.createElement("article");
      const clipLabel = document.createElement("h1");
      const clipTime = document.createElement("p");
      const audio = document.createElement("audio");
      const deleteButton = document.createElement("button");

      clipContainer.classList.add("clip");
      audio.setAttribute("controls", "");
      deleteButton.textContent = "Delete";
      deleteButton.className = "delete";
      clipLabel.className = "clipLabel";
      clipTime.className = "clipTime";

      if (clipName === null) {
        clipLabel.textContent = "My unnamed clip";
      } else {
        clipLabel.textContent = clipName;
      }

      timeStamp = new Date;
      clipTime.textContent = timeStamp.toLocaleString();

      clipContainer.appendChild(audio);
      clipContainer.appendChild(clipLabel);
      clipLabel.appendChild(clipTime);
      clipContainer.appendChild(deleteButton);
      soundClips.appendChild(clipContainer);

      audio.controls = true;
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
      chunks = [];
      const audioURL = window.URL.createObjectURL(blob);
      uploadFile(blob, clipName);
      audio.src = audioURL;
      console.log("recorder stopped");

      deleteButton.onclick = function (e) {
        e.target.closest(".clip").remove();
      };

      clipLabel.onclick = function () {
        const existingName = clipLabel.textContent;
        const newClipName = prompt("Enter a new name for your sound clip?");
        if (newClipName === null) {
          clipLabel.textContent = existingName;
        } else {
          clipLabel.textContent = newClipName;
        }
      };
    };

    mediaRecorder.ondataavailable = function (e) {
      chunks.push(e.data);
    };
  };

  let onError = function (err) {
    console.log("The following error occured: " + err);
  };

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
} else {
  console.log("MediaDevices.getUserMedia() not supported on your browser!");
}

function visualize(stream) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const source = audioCtx.createMediaStreamSource(stream);

  const bufferLength = 2048;
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = bufferLength;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);

  draw();

  function draw() {
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "rgb(255, 255, 255)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0, 0, 0)";

    canvasCtx.beginPath();

    let sliceWidth = (WIDTH * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0;
      let y = (v * HEIGHT) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
}

window.onresize = function () {
  canvas.width = mainSection.offsetWidth;
};

window.onresize();


// Set API access scope before proceeding authorization request
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
let tokenClient;
let gapiInited = false;
let gisInited = false;

// document.getElementById('authorize_button').style.visibility = 'hidden';
// document.getElementById('signout_button').style.visibility = 'hidden';

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
	gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
	await gapi.client.init({
		apiKey: env.GOOGLE_DRIVE_API_KEY,
		discoveryDocs: [DISCOVERY_DOC],
	});
	gapiInited = true;
	maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
	tokenClient = google.accounts.oauth2.initTokenClient({
		client_id: env.GOOGLE_DRIVE_CLIENT_ID_VAR,
		scope: SCOPES,
		callback: '', // defined later
	});
	gisInited = true;
	maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
	if (gapiInited && gisInited) {
		document.getElementById('authorize_button').style.visibility = 'visible';
	}
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
	tokenClient.callback = async (resp) => {
		if (resp.error !== undefined) {
			throw (resp);
		}
		document.getElementById('signout_button').style.visibility = 'visible';
		document.getElementById('authorize_button').value = 'Refresh';
		// await uploadFile();

	};

	if (gapi.client.getToken() === null) {
		// Prompt the user to select a Google Account and ask for consent to share their data
		// when establishing a new session.
		tokenClient.requestAccessToken({ prompt: 'consent' });
	} else {
		// Skip display of account chooser and consent dialog for an existing session.
		tokenClient.requestAccessToken({ prompt: '' });
	}
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
	const token = gapi.client.getToken();
	if (token !== null) {
		google.accounts.oauth2.revoke(token.access_token);
		gapi.client.setToken('');
		document.getElementById('content').style.display = 'none';
		document.getElementById('content').innerHTML = '';
		document.getElementById('authorize_button').value = 'Authorize';
		// document.getElementById('signout_button').style.visibility = 'hidden';
	}
}

/**
 * Upload file to Google Drive.
 */
async function uploadFile(recFile, clipName) {
	var fileContent = 'Hello World'; // As a sample, upload a text file.
	// var file = new Blob([fileContent], { type: 'text/plain' });
	var file = recFile;
  fileTimeStamp = new Date; 
  fileTime = fileTimeStamp.toISOString();
	var metadata = {
		'name': clipName + '_' + fileTime + '.webm', // Filename at Google Drive
		'mimeType': 'audio/webm', // mimeType at Google Drive
		// TODO [Optional]: Set the below credentials
		// Note: remove this parameter, if no target is needed
		'parents': ['1rD041CK4f59PJrBP6NUhzDNRfdnK1O-G'], // Folder ID at Google Drive which is optional
	};

	var accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
	var form = new FormData();
	form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
	form.append('file', file);
  
  for (var key of form.entries()) {
    console.log(key[0] + ', ' + key[1]);
}


	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id' );
	xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
	xhr.responseType = 'json';
	xhr.onload = () => {
		console.log(xhr.response.id);
    console.log(xhr.response);
	};
	xhr.send(form);

}
