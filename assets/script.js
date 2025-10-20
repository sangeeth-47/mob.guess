let fileInput, preview, previewContainer, result;

    function toggleQA() {
      const qaBox = document.getElementById("qaBox");
      qaBox.style.display = qaBox.style.display === "block" ? "none" : "block";
    }
    function removeImage() {
      fileInput.value = "";
      preview.src = "";
      preview.removeAttribute("src");
      preview.style.display = "none";
      previewContainer.style.display = "none";
      if (result) result.textContent = "";
    }
    function initApp() {    
        const dropZone = document.getElementById("dropZone");
        fileInput = document.getElementById("imageInput");
        preview = document.getElementById("preview");
        previewContainer = document.getElementById("previewContainer");
        result = document.getElementById("status");  

        // Allowed image MIME types
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes

        // Drag & Drop
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("dragover");
        });

        dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
            const file = e.dataTransfer.files[0];

            if (!file) return;

            if (!allowedTypes.includes(file.type)) {
                alert("Please drop a valid image file (JPEG, PNG, GIF, WEBP).");
                return;
            }

            if (file.size > maxSize) {
                alert("File size must be less than 5MB.");
                return;
            }

            fileInput.files = e.dataTransfer.files;
            previewImage({ target: { files: [file] } });
        });

        // File input change
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!allowedTypes.includes(file.type)) {
                alert("Please select a valid image file (JPEG, PNG, GIF, WEBP).");
                fileInput.value = "";
                return;
            }

            if (file.size > maxSize) {
                alert("File size must be less than 5MB.");
                fileInput.value = "";
                return;
            }

            previewImage(e);
        });

    function previewImage(fileUri) {
    const preview = document.getElementById('preview');
    const container = document.getElementById('previewContainer');
    preview.src = fileUri;
    container.style.display = "block";
}
    let visitorLogId = null; // store the original logId globally
    // Generate session_hash for Gradio
    const sessionHash = Math.random().toString(36).substring(2);

// Fetch visitor count and initial logId on page load
fetch("https://sangeeth2314105883websitecounter.azurewebsites.net/api/VisitCounterFunction?")
  .then(res => res.ok ? res.json() : Promise.reject("API error"))
  .then(data => {
    document.getElementById("visitCount").innerText = data.totalVisits != null 
      ? "Visitor Count: " + data.totalVisits 
      : "Visitor count not found";
    visitorLogId = data.logId; // store logId from first visit
  })
  .catch(() => document.getElementById("visitCount").innerText = "Unable to fetch visitor count.");

async function submitImage() {
  const inputElem = document.getElementById('imageInput');
  const spinner = document.getElementById('spinner');
  const status = document.getElementById('status');
  const guessBtn = document.getElementById('guessBtn');
  // Use the logId from page load
  const logId = visitorLogId;
  
  if (!inputElem.files.length) {
    alert("Please upload an image first.");
    return;
  }

  const file = inputElem.files[0];
  spinner.style.display = "inline-block";
  status.innerText = "";
  guessBtn.disabled = true;

  try {
    // Read image
    const arrayBuffer = await file.arrayBuffer();
    const payload = {
      idNum: logId,
      sessionhash: sessionHash,
      name: file.name,
      size: file.size,
      type: file.type,
      data: Array.from(new Uint8Array(arrayBuffer))
    };

    // 1️⃣ Upload image
    const uploadResp = await fetch("https://sangeeth2314105883websitecounter.azurewebsites.net/api/uploadimage?", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!uploadResp.ok) throw new Error(`Upload failed: ${uploadResp.status}`);
    const { session_hash, error } = await uploadResp.json();
    if (error) throw new Error(error);
    if (!session_hash) throw new Error("Upload failed");

    status.innerText = "🟢 Waiting for result...";

    // 2️⃣ Track result from Hugging Face
    const src = new EventSource(`https://sangeeth47-age-gender-predictor.hf.space/gradio_api/queue/data?session_hash=${session_hash}`);
    src.onmessage = e => {
      if (!e.data || e.data === "ping") return;
      const msg = JSON.parse(e.data);

      if (msg.msg === "process_completed") {
        const resultText = msg.output?.data?.[0] || "❌ Error: Empty response";

        // Show immediately
        if (resultText.toLowerCase().includes("no face")) {
          document.getElementById("faceToast").classList.remove("hidden");
          setTimeout(() => document.getElementById("faceToast").classList.add("hidden"), 6000);
          status.innerText = "";
        } else {
          status.innerText = `✅ Result: ${resultText}`;
        }

        spinner.style.display = "none";
        guessBtn.disabled = false;
        src.close();

        // 3️⃣ Post result to DB in background (fire & forget)
        if (logId) {
          fetch("https://sangeeth2314105883websitecounter.azurewebsites.net/api/VisitCounterFunction?", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logId: logId, resultText: resultText })
          }).catch(err => console.warn("Background result update failed:", err));
        }

      } else if (msg.msg === "process_starts") {
        status.innerText = "🟡 Processing image...";
      } else if (msg.msg === "process_failed") {
        status.innerText = "❌ Prediction failed.";
        spinner.style.display = "none";
        guessBtn.disabled = false;
        src.close();
      }
    };

    src.onerror = () => {
      status.innerText = "❌ Stream error";
      spinner.style.display = "none";
      guessBtn.disabled = false;
      src.close();
    };

  } catch (err) {
    console.error(err);
    status.innerText = "❌ Unexpected error.";
    spinner.style.display = "none";
    guessBtn.disabled = false;
  }
}

// Bind event
document.getElementById("guessBtn").addEventListener("click", submitImage);

const messages = [
  "🚧 This site is under development. Expect bugs, surprises, and maybe a dragon.",
  "🚧 Temporary pause while we chase down some bugs (literally).",
  "💤 Idle code never sleeps… except when it does.",
  "⚠️ AI still in training... don't judge it too harshly!",
  "🛠️ Beta mode: Some features are powered by hope and duct tape.",
  "🧪 Experimental features ahead. Google & ChatGPT is the only hope.",
  "⏳ Page may randomly take coffee breaks. Patience appreciated!",
  "📡 If this page lags, it's probably buffering its thoughts.",
  "🐞 Bugs are features in disguise.",
  "💾 Site is taking a quick nap. It promises to wake up refreshed!",
  "🧠 AI prediction accuracy: somewhere between genius and shit.",
  "💡 Built with love, caffeine, and some questionable logic.",
  "👽 Aliens might’ve helped code this. We’re still investigating."
];

let currentIndex = 0;
const notice = document.getElementById("devNotice");

function rotateMessage() {
  notice.textContent = messages[currentIndex];
  currentIndex = (currentIndex + 1) % messages.length;
}

// Show the first message immediately
rotateMessage();

// Rotate every 5 seconds
setInterval(rotateMessage, 5000);
    }

    //Background stars animation

    var Delaunay;!function(){"use strict";var r=1/1048576;function n(n,e,t,u){var i,l,o,a,f,h,s,I,c,N,p=n[e][0],g=n[e][1],v=n[t][0],E=n[t][1],T=n[u][0],b=n[u][1],k=Math.abs(g-E),m=Math.abs(E-b);if(k<r&&m<r)throw new Error("Eek! Coincident points!");return k<r?l=(a=-(T-v)/(b-E))*((i=(v+p)/2)-(h=(v+T)/2))+(I=(E+b)/2):m<r?l=(o=-(v-p)/(E-g))*((i=(T+v)/2)-(f=(p+v)/2))+(s=(g+E)/2):(i=((o=-(v-p)/(E-g))*(f=(p+v)/2)-(a=-(T-v)/(b-E))*(h=(v+T)/2)+(I=(E+b)/2)-(s=(g+E)/2))/(o-a),l=k>m?o*(i-f)+s:a*(i-h)+I),{i:e,j:t,k:u,x:i,y:l,r:(c=v-i)*c+(N=E-l)*N}}function e(r){var n,e,t,u,i,l;for(e=r.length;e;)for(u=r[--e],t=r[--e],n=e;n;)if(l=r[--n],t===(i=r[--n])&&u===l||t===l&&u===i){r.splice(e,2),r.splice(n,2);break}}Delaunay={triangulate:function(t,u){var i,l,o,a,f,h,s,I,c,N,p,g,v=t.length;if(v<3)return[];if(t=t.slice(0),u)for(i=v;i--;)t[i]=t[i][u];for(o=new Array(v),i=v;i--;)o[i]=i;for(o.sort((function(r,n){return t[n][0]-t[r][0]})),a=function(r){var n,e,t,u,i,l,o=Number.POSITIVE_INFINITY,a=Number.POSITIVE_INFINITY,f=Number.NEGATIVE_INFINITY,h=Number.NEGATIVE_INFINITY;for(n=r.length;n--;)r[n][0]<o&&(o=r[n][0]),r[n][0]>f&&(f=r[n][0]),r[n][1]<a&&(a=r[n][1]),r[n][1]>h&&(h=r[n][1]);return t=h-a,[[(i=o+.5*(e=f-o))-20*(u=Math.max(e,t)),(l=a+.5*t)-u],[i,l+20*u],[i+20*u,l-u]]}(t),t.push(a[0],a[1],a[2]),f=[n(t,v+0,v+1,v+2)],h=[],s=[],i=o.length;i--;s.length=0){for(g=o[i],l=f.length;l--;)(I=t[g][0]-f[l].x)>0&&I*I>f[l].r?(h.push(f[l]),f.splice(l,1)):I*I+(c=t[g][1]-f[l].y)*c-f[l].r>r||(s.push(f[l].i,f[l].j,f[l].j,f[l].k,f[l].k,f[l].i),f.splice(l,1));for(e(s),l=s.length;l;)p=s[--l],N=s[--l],f.push(n(t,N,p,g))}for(i=f.length;i--;)h.push(f[i]);for(f.length=0,i=h.length;i--;)h[i].i<v&&h[i].j<v&&h[i].k<v&&f.push(h[i].i,h[i].j,h[i].k);return f},contains:function(r,n){if(n[0]<r[0][0]&&n[0]<r[1][0]&&n[0]<r[2][0]||n[0]>r[0][0]&&n[0]>r[1][0]&&n[0]>r[2][0]||n[1]<r[0][1]&&n[1]<r[1][1]&&n[1]<r[2][1]||n[1]>r[0][1]&&n[1]>r[1][1]&&n[1]>r[2][1])return null;var e=r[1][0]-r[0][0],t=r[2][0]-r[0][0],u=r[1][1]-r[0][1],i=r[2][1]-r[0][1],l=e*i-t*u;if(0===l)return null;var o=(i*(n[0]-r[0][0])-t*(n[1]-r[0][1]))/l,a=(e*(n[1]-r[0][1])-u*(n[0]-r[0][0]))/l;return o<0||a<0||o+a>1?null:[o,a]}},"undefined"!=typeof module&&(module.exports=Delaunay)}();
    var particleCount = 40,
  flareCount = 10,
  motion = 0.05,
  tilt = 0.05,
  color = '#FFEED4',
  particleSizeBase = 1,
  particleSizeMultiplier = 0.5,
  flareSizeBase = 100,
  flareSizeMultiplier = 100,
  lineWidth = 1,
  linkChance = 75, // chance per frame of link, higher = smaller chance
  linkLengthMin = 5, // min linked vertices
  linkLengthMax = 7, // max linked vertices
  linkOpacity = 0.25; // number between 0 & 1
  linkFade = 90, // link fade-out frames
  linkSpeed = 1, // distance a link travels in 1 frame
  glareAngle = -60,
  glareOpacityMultiplier = 0.05,
  renderParticles = true,
  renderParticleGlare = true,
  renderFlares = true,
  renderLinks = true,
  renderMesh = false,
  flicker = true,
  flickerSmoothing = 15, // higher = smoother flicker
  blurSize = 0,
  orbitTilt = true,
  randomMotion = true,
  noiseLength = 1000,
  noiseStrength = 1;

var canvas = document.getElementById('stars'),
  //orbits = document.getElementById('orbits'),
  context = canvas.getContext('2d'),
  mouse = { x: 0, y: 0 },
  m = {},
  r = 0,
  c = 1000, // multiplier for delaunay points, since floats too small can mess up the algorithm
  n = 0,
  nAngle = (Math.PI * 2) / noiseLength,
  nRad = 100,
  nScale = 0.5,
  nPos = {x: 0, y: 0},
  points = [],
  vertices = [],
  triangles = [],
  links = [],
  particles = [],
  flares = [];

function init() {
  var i, j, k;

  // requestAnimFrame polyfill
  window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function( callback ){
          window.setTimeout(callback, 1000 / 60);
        };
  })();

  // Fade in background
  /*
  var background = document.getElementById('background'),
    bgImg = new Image(),
    bgURL = '/img/background.jpg';
  bgImg.onload = function() {
    //console.log('background loaded');
    background.style.backgroundImage = 'url("'+bgURL+'")';
    background.className += ' loaded';
  }
  bgImg.src = bgURL;
  */

  // Size canvas
  resize();

  mouse.x = canvas.clientWidth / 2;
  mouse.y = canvas.clientHeight / 2;

  // Create particle positions
  for (i = 0; i < particleCount; i++) {
    var p = new Particle();
    particles.push(p);
    points.push([p.x*c, p.y*c]);
  }

  //console.log(JSON.stringify(points));

  // Delaunay triangulation
  //var Delaunay = require('delaunay-fast');
  vertices = Delaunay.triangulate(points);
  //console.log(JSON.stringify(vertices));
  // Create an array of "triangles" (groups of 3 indices)
  var tri = [];
  for (i = 0; i < vertices.length; i++) {
    if (tri.length == 3) {
      triangles.push(tri);
      tri = [];
    }
    tri.push(vertices[i]);
  }
  //console.log(JSON.stringify(triangles));

  // Tell all the particles who their neighbors are
  for (i = 0; i < particles.length; i++) {
    // Loop through all tirangles
    for (j = 0; j < triangles.length; j++) {
      // Check if this particle's index is in this triangle
      k = triangles[j].indexOf(i);
      // If it is, add its neighbors to the particles contacts list
      if (k !== -1) {
        triangles[j].forEach(function(value, index, array) {
          if (value !== i && particles[i].neighbors.indexOf(value) == -1) {
            particles[i].neighbors.push(value);
          }
        });
      }
    }
  }
  //console.log(JSON.stringify(particles));

  if (renderFlares) {
    // Create flare positions
    for (i = 0; i < flareCount; i++) {
      flares.push(new Flare());
    }
  }

  // Motion mode
  //if (Modernizr && Modernizr.deviceorientation) {
  if ('ontouchstart' in document.documentElement && window.DeviceOrientationEvent) {
    console.log('Using device orientation');
    window.addEventListener('deviceorientation', function(e) {
      mouse.x = (canvas.clientWidth / 2) - ((e.gamma / 90) * (canvas.clientWidth / 2) * 2);
      mouse.y = (canvas.clientHeight / 2) - ((e.beta / 90) * (canvas.clientHeight / 2) * 2);
      //console.log('Center: x:'+(canvas.clientWidth/2)+' y:'+(canvas.clientHeight/2));
      //console.log('Orientation: x:'+mouse.x+' ('+e.gamma+') y:'+mouse.y+' ('+e.beta+')');
    }, true);
  }
  else {
    // Mouse move listener
    console.log('Using mouse movement');
    document.body.addEventListener('mousemove', function(e) {
      //console.log('moved');
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
  }

  // Random motion
  if (randomMotion) {
    //var SimplexNoise = require('simplex-noise');
    //var simplex = new SimplexNoise();
  }

  // Animation loop
  (function animloop(){
    requestAnimFrame(animloop);
    resize();
    render();
  })();
}

function render() {
  if (randomMotion) {
    n++;
    if (n >= noiseLength) {
      n = 0;
    }

    nPos = noisePoint(n);
    //console.log('NOISE x:'+nPos.x+' y:'+nPos.y);
  }

  // Clear
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (blurSize > 0) {
    context.shadowBlur = blurSize;
    context.shadowColor = color;
  }

  if (renderParticles) {
    // Render particles
    for (var i = 0; i < particleCount; i++) {
      particles[i].render();
    }
  }

  if (renderMesh) {
    // Render all lines
    context.beginPath();
    for (var v = 0; v < vertices.length-1; v++) {
      // Splits the array into triplets
      if ((v + 1) % 3 === 0) { continue; }

      var p1 = particles[vertices[v]],
        p2 = particles[vertices[v+1]];

      //console.log('Line: '+p1.x+','+p1.y+'->'+p2.x+','+p2.y);

      var pos1 = position(p1.x, p1.y, p1.z),
        pos2 = position(p2.x, p2.y, p2.z);

      context.moveTo(pos1.x, pos1.y);
      context.lineTo(pos2.x, pos2.y);
    }
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
    context.closePath();
  }

  if (renderLinks) {
    // Possibly start a new link
    if (random(0, linkChance) == linkChance) {
      var length = random(linkLengthMin, linkLengthMax);
      var start = random(0, particles.length-1);
      startLink(start, length);
    }

    // Render existing links
    // Iterate in reverse so that removing items doesn't affect the loop
    for (var l = links.length-1; l >= 0; l--) {
      if (links[l] && !links[l].finished) {
        links[l].render();
      }
      else {
        delete links[l];
      }
    }
  }

  if (renderFlares) {
    // Render flares
    for (var j = 0; j < flareCount; j++) {
      flares[j].render();
    }
  }

  /*
  if (orbitTilt) {
    var tiltX = -(((canvas.clientWidth / 2) - mouse.x + ((nPos.x - 0.5) * noiseStrength)) * tilt),
      tiltY = (((canvas.clientHeight / 2) - mouse.y + ((nPos.y - 0.5) * noiseStrength)) * tilt);

    orbits.style.transform = 'rotateY('+tiltX+'deg) rotateX('+tiltY+'deg)';
  }
  */
}

function resize() {
  canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
  canvas.height = canvas.width * (canvas.clientHeight / canvas.clientWidth);
}

function startLink(vertex, length) {
  //console.log('LINK from '+vertex+' (length '+length+')');
  links.push(new Link(vertex, length));
}

// Particle class
var Particle = function() {
  this.x = random(-0.1, 1.1, true);
  this.y = random(-0.1, 1.1, true);
  this.z = random(0,4);
  this.color = color;
  this.opacity = random(0.1,1,true);
  this.flicker = 0;
  this.neighbors = []; // placeholder for neighbors
};
Particle.prototype.render = function() {
  var pos = position(this.x, this.y, this.z),
    r = ((this.z * particleSizeMultiplier) + particleSizeBase) * (sizeRatio() / 1000),
    o = this.opacity;

  if (flicker) {
    var newVal = random(-0.5, 0.5, true);
    this.flicker += (newVal - this.flicker) / flickerSmoothing;
    if (this.flicker > 0.5) this.flicker = 0.5;
    if (this.flicker < -0.5) this.flicker = -0.5;
    o += this.flicker;
    if (o > 1) o = 1;
    if (o < 0) o = 0;
  }

  context.fillStyle = this.color;
  context.globalAlpha = o;
  context.beginPath();
  context.arc(pos.x, pos.y, r, 0, 2 * Math.PI, false);
  context.fill();
  context.closePath();

  if (renderParticleGlare) {
    context.globalAlpha = o * glareOpacityMultiplier;
    /*
    context.ellipse(pos.x, pos.y, r * 30, r, 90 * (Math.PI / 180), 0, 2 * Math.PI, false);
    context.fill();
    context.closePath();
    */
    context.ellipse(pos.x, pos.y, r * 100, r, (glareAngle - ((nPos.x - 0.5) * noiseStrength * motion)) * (Math.PI / 180), 0, 2 * Math.PI, false);
    context.fill();
    context.closePath();
  }

  context.globalAlpha = 1;
};

// Flare class
var Flare = function() {
  this.x = random(-0.25, 1.25, true);
  this.y = random(-0.25, 1.25, true);
  this.z = random(0,2);
  this.color = color;
  this.opacity = random(0.001, 0.01, true);
};
Flare.prototype.render = function() {
  var pos = position(this.x, this.y, this.z),
    r = ((this.z * flareSizeMultiplier) + flareSizeBase) * (sizeRatio() / 1000);

  // Feathered circles
  /*
  var grad = context.createRadialGradient(x+r,y+r,0,x+r,y+r,r);
  grad.addColorStop(0, 'rgba(255,255,255,'+f.o+')');
  grad.addColorStop(0.8, 'rgba(255,255,255,'+f.o+')');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = grad;
  context.beginPath();
  context.fillRect(x, y, r*2, r*2);
  context.closePath();
  */

  context.beginPath();
  context.globalAlpha = this.opacity;
  context.arc(pos.x, pos.y, r, 0, 2 * Math.PI, false);
  context.fillStyle = this.color;
  context.fill();
  context.closePath();
  context.globalAlpha = 1;
};

// Link class
var Link = function(startVertex, numPoints) {
  this.length = numPoints;
  this.verts = [startVertex];
  this.stage = 0;
  this.linked = [startVertex];
  this.distances = [];
  this.traveled = 0;
  this.fade = 0;
  this.finished = false;
};
Link.prototype.render = function() {
  // Stages:
  // 0. Vertex collection
  // 1. Render line reaching from vertex to vertex
  // 2. Fade out
  // 3. Finished (delete me)

  var i, p, pos, points;

  switch (this.stage) {
    // VERTEX COLLECTION STAGE
    case 0:

      // Grab the last member of the link
      var last = particles[this.verts[this.verts.length-1]];
      //console.log(JSON.stringify(last));
      if (last && last.neighbors && last.neighbors.length > 0) {
        // Grab a random neighbor
        var neighbor = last.neighbors[random(0, last.neighbors.length-1)];
        // If we haven't seen that particle before, add it to the link
        if (this.verts.indexOf(neighbor) == -1) {
          this.verts.push(neighbor);
        }
        // If we have seen that particle before, we'll just wait for the next frame
      }
      else {
        //console.log(this.verts[0]+' prematurely moving to stage 3 (0)');
        this.stage = 3;
        this.finished = true;
      }

      if (this.verts.length >= this.length) {
        // Calculate all distances at once
        for (i = 0; i < this.verts.length-1; i++) {
          var p1 = particles[this.verts[i]],
            p2 = particles[this.verts[i+1]],
            dx = p1.x - p2.x,
            dy = p1.y - p2.y,
            dist = Math.sqrt(dx*dx + dy*dy);

            this.distances.push(dist);
        }
        //console.log('Distances: '+JSON.stringify(this.distances));
        //console.log('verts: '+this.verts.length+' distances: '+this.distances.length);

        //console.log(this.verts[0]+' moving to stage 1');
        this.stage = 1;
      }
    break;

    // RENDER LINE ANIMATION STAGE
    case 1:
      if (this.distances.length > 0) {

        points = [];
        //var a = 1;

        // Gather all points already linked
        for (i = 0; i < this.linked.length; i++) {
          p = particles[this.linked[i]];
          pos = position(p.x, p.y, p.z);
          points.push([pos.x, pos.y]);
        }

        var linkSpeedRel = linkSpeed * 0.00001 * canvas.width;
        this.traveled += linkSpeedRel;
        var d = this.distances[this.linked.length-1];
        // Calculate last point based on linkSpeed and distance travelled to next point
        if (this.traveled >= d) {
          this.traveled = 0;
          // We've reached the next point, add coordinates to array
          //console.log(this.verts[0]+' reached vertex '+(this.linked.length+1)+' of '+this.verts.length);

          this.linked.push(this.verts[this.linked.length]);
          p = particles[this.linked[this.linked.length-1]];
          pos = position(p.x, p.y, p.z);
          points.push([pos.x, pos.y]);

          if (this.linked.length >= this.verts.length) {
            //console.log(this.verts[0]+' moving to stage 2 (1)');
            this.stage = 2;
          }
        }
        else {
          // We're still travelling to the next point, get coordinates at travel distance
          // http://math.stackexchange.com/a/85582
          var a = particles[this.linked[this.linked.length-1]],
            b = particles[this.verts[this.linked.length]],
            t = d - this.traveled,
            x = ((this.traveled * b.x) + (t * a.x)) / d,
            y = ((this.traveled * b.y) + (t * a.y)) / d,
            z = ((this.traveled * b.z) + (t * a.z)) / d;

          pos = position(x, y, z);

          //console.log(this.verts[0]+' traveling to vertex '+(this.linked.length+1)+' of '+this.verts.length+' ('+this.traveled+' of '+this.distances[this.linked.length]+')');

          points.push([pos.x, pos.y]);
        }

        this.drawLine(points);
      }
      else {
        //console.log(this.verts[0]+' prematurely moving to stage 3 (1)');
        this.stage = 3;
        this.finished = true;
      }
    break;

    // FADE OUT STAGE
    case 2:
      if (this.verts.length > 1) {
        if (this.fade < linkFade) {
          this.fade++;

          // Render full link between all vertices and fade over time
          points = [];
          var alpha = (1 - (this.fade / linkFade)) * linkOpacity;
          for (i = 0; i < this.verts.length; i++) {
            p = particles[this.verts[i]];
            pos = position(p.x, p.y, p.z);
            points.push([pos.x, pos.y]);
          }
          this.drawLine(points, alpha);
        }
        else {
          //console.log(this.verts[0]+' moving to stage 3 (2a)');
          this.stage = 3;
          this.finished = true;
        }
      }
      else {
        //console.log(this.verts[0]+' prematurely moving to stage 3 (2b)');
        this.stage = 3;
        this.finished = true;
      }
    break;

    // FINISHED STAGE
    case 3:
    default:
      this.finished = true;
    break;
  }
};
Link.prototype.drawLine = function(points, alpha) {
  if (typeof alpha !== 'number') alpha = linkOpacity;

  if (points.length > 1 && alpha > 0) {
    //console.log(this.verts[0]+': Drawing line '+alpha);
    context.globalAlpha = alpha;
    context.beginPath();
    for (var i = 0; i < points.length-1; i++) {
      context.moveTo(points[i][0], points[i][1]);
      context.lineTo(points[i+1][0], points[i+1][1]);
    }
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
    context.closePath();
    context.globalAlpha = 1;
  }
};


// Utils

function noisePoint(i) {
  var a = nAngle * i,
    cosA = Math.cos(a),
    sinA = Math.sin(a),
    //value = simplex.noise2D(nScale * cosA + nScale, nScale * sinA + nScale),
    //rad = nRad + value;
    rad = nRad;
  return {
    x: rad * cosA,
    y: rad * sinA
  };
}

function position(x, y, z) {
  return {
    x: (x * canvas.width) + ((((canvas.width / 2) - mouse.x + ((nPos.x - 0.5) * noiseStrength)) * z) * motion),
    y: (y * canvas.height) + ((((canvas.height / 2) - mouse.y + ((nPos.y - 0.5) * noiseStrength)) * z) * motion)
  };
}

function sizeRatio() {
  return canvas.width >= canvas.height ? canvas.width : canvas.height;
}

function random(min, max, float) {
  return float ?
    Math.random() * (max - min) + min :
    Math.floor(Math.random() * (max - min + 1)) + min;
}


// init
if (canvas) init();