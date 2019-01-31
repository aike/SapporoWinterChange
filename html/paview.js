/*
 *
 * This program is licensed under the MIT License.
 * Copyright 2014, aike (@aike1000)
 *
 */

var PaView = function(arg) {

	// server.jsは同じドメインに居る前提。
	var url = window.document.location.host.replace(/:.*/, '');
	var wsport = 3100;  // WebSocketのPort番号

	// WebSocket開始
	this.wsOsc = {};
	this.wsOsc.ws = new WebSocket('ws://' + url + ':'+wsport);
	this.wsOsc.status = 0;       // 0: 送れる 1: 送れない
	this.wsOsc.ws.onopen = () => {
	    this.wsOsc.status = 1;   // 送れる
	};
	this.wsOsc.ws.onclose = () => {
	    this.wsOsc.status = 0;   // 送れない
	};
	this.wsOsc.send = (path,type,data) => {
	    var jsonobj = {"osc":"WsOscSend","path":path,"type":type,"data":data};
	    var json = JSON.stringify(jsonobj);

	    // 送れれば送る
	    if(this.wsOsc.status){
	        this.wsOsc.ws.send(json);
	    }
	};


	///////// degree to radian utility function
	this.d2r = function(d) { return d * Math.PI / 180; };

	///////// Option Setting
	this.id = arg.id;											// id of parent element *required*
	// note: movie file must be located at same origin
	this.file = arg.file;										// movie filename *required*
	this.srcwidth = arg.srcwidth;								// movie width *required*
	this.srcheight = arg.srcheight;								// movie height *required*

	this.width = (arg.width == undefined) ? 500 : arg.width;				// view width  (500)
	this.height = (arg.height == undefined) ? 300 : arg.height;				// view height (300)
	this.zoom = (arg.zoom == undefined) ? 70 : arg.zoom;					// 20 .. 130 (70)
	this.firstview = (arg.firstview == undefined) ? 0 : this.d2r(-arg.firstview);// 0 .. 360 (0)
	this.degree = (arg.degree == undefined) ? [0, 0, 0]						// [0,0,0] .. [360,360,360] ([0,0,0])
					: [this.d2r(arg.degree[0]), this.d2r(arg.degree[1]), this.d2r(arg.degree[2])];
	this.rendererType = (arg.rendererType == undefined) ? 0 : arg.rendererType;	// 0,1,2 (0)

	///////// camera direction
	this.pan = this.firstview;
	this.tilt = 0;
	this.cameraDir = new THREE.Vector3(Math.sin(this.pan), Math.sin(this.tilt), Math.cos(this.pan));
	this.oldPosition = {x:null, y:null};
	this.mousedown = false;

	///////// etc
	this.fading = false;
	this.seekwait = 0;
	this.isTouchDevice = false;

	this.cnt = 0;

	// notify filename
	setTimeout(() => {
		this.wsOsc.send('/mv/file', 's', this.file.replace(/^.*\//, ''));
	}, 100);

	///////// call main process
	this.show();
}

///////// drag callback
PaView.prototype.rotateCamera = function(x, y) {
	if (!this.mousedown)
		return;

	var pos = {x:x, y:y};
	if (this.oldPosition.x === null) {
		this.oldPosition = pos;
		return;
	}

	this.pan -= (this.oldPosition.x - pos.x) * 0.005;
	this.tilt -= (this.oldPosition.y - pos.y) * 0.004;
	var limit = Math.PI / 2 - 0.1;
	if (this.tilt > limit) this.tilt = limit;
	if (this.tilt < -limit) this.tilt = -limit;

	this.cameraDir.x = Math.sin(this.pan) * Math.cos(this.tilt);
	this.cameraDir.z = Math.cos(this.pan) * Math.cos(this.tilt);
	this.cameraDir.y = Math.sin(this.tilt);

	this.camera.lookAt(this.cameraDir);
	this.oldPosition = pos;
}

///////// wheel callback
PaView.prototype.zoomCamera = function(val) {
	this.zoom += val * 0.1;
	if (this.zoom < 20) this.zoom = 20;
	if (this.zoom > 130) this.zoom = 130;
	this.camera.fov = this.zoom;
	this.camera.updateProjectionMatrix();
}


///////// rotation callback
PaView.prototype.setCameraDir = function(alpha, beta, gamma) {

	// this.cnt++;
	// if (this.cnt > 30) {
	// 	this.cnt = 0;
	// 	console.log('oren:' + window.orientation + ' al:' + alpha + ' bt:' + beta + ' gamma:' + gamma);
	// 	console.log(' x:' + (-gamma - Math.PI / 2) + ' gamma:' + gamma);
	// }

	switch (window.orientation) {
		case 0:
			this.mesh.rotation.x = this.degree[0] + Math.PI + Math.PI / 2;
			this.mesh.rotation.y = this.degree[1];
			this.mesh.rotation.z = this.degree[2];
			this.camera.rotation.x = beta;
			this.camera.rotation.y = gamma;
			this.camera.rotation.z = alpha;
			break;
		case 90:
			this.mesh.rotation.x = this.degree[0] + Math.PI;
			this.mesh.rotation.y = this.degree[1] + alpha - Math.PI / 2;
			this.mesh.rotation.z = this.degree[2];
			this.camera.rotation.x = (-gamma - Math.PI / 2) * -Math.sign(gamma);
			this.camera.rotation.y = 0;
			this.camera.rotation.z = -beta;
			break;
		case -90:
			this.mesh.rotation.x = this.degree[0] + Math.PI;
			this.mesh.rotation.y = this.degree[1] + alpha - Math.PI / 2;
			this.mesh.rotation.z = this.degree[2] + 0;
			this.camera.rotation.x = -(-gamma - Math.PI / 2) * -Math.sign(gamma);
			this.camera.rotation.y = 0;
			this.camera.rotation.z = -beta + Math.PI;
			break;
		case 180:
			this.mesh.rotation.x = this.degree[0] + Math.PI + Math.PI / 2;
			this.mesh.rotation.y = this.degree[1];
			this.mesh.rotation.z = this.degree[2];
			this.camera.rotation.x = -beta;
			this.camera.rotation.y = -gamma;
			this.camera.rotation.z = alpha + Math.PI;
			break;
		}
};


///////// control functions
PaView.prototype.play = function() {
	if (!this.playing) {
		this.pause();
	}
}

PaView.prototype.pause = function() {
	if (this.playing) {
		console.log('pause');
		this.wsOsc.send('/mv/pause', 'f', this.video.currentTime);
		this.video.pause();
		this.btn.style.display = 'block';
		this.backbtn.style.display = 'block';
		this.ctrl.style.display = 'block';
		if (this.info)
			this.info.style.display = 'block';
	} else {
		console.log('play');
		this.wsOsc.send('/mv/play', 'f', this.video.currentTime);
		this.video.play();
		this.btn.style.display = 'none';
		this.backbtn.style.display = 'none';
		if (this.info)
			this.info.style.display = 'none';
	}
	this.playing = !this.playing;
}

PaView.prototype.fadeoutCtrlBar = function() {
	if (!this.fading) {	// break
		this.ctrl.style.display = 'block';
		this.ctrl.style.opacity = 1.0;
		return;
	}
	this.ctrl.style.opacity -= 0.1;
	if (this.ctrl.style.opacity < 0) {
		this.ctrl.style.display = 'none';
		this.ctrl.style.opacity = 1.0;
	} else {
		var self = this;
		setTimeout(function() { self.fadeoutCtrlBar(); }, 20);
	}
}

PaView.prototype.drawCtrlBar = function(ratio) {
	var bar1;
	var bar2;
	if (ratio !== undefined) {
		bar1 = this.barlen * ratio;
		bar2 = bar1;
	} else {
		bar1 = this.barlen * this.video.currentTime / this.video.duration;
		var buf = this.video.buffered;
		bar2 = this.barlen * buf.end(buf.length - 1) / this.video.duration;
	}
	this.ctrlctx.clearRect(10, 3, this.barlen, 14);
	this.ctrlctx.fillStyle = 'rgba(220,220,220,0.6)';
	this.ctrlctx.fillRect(10, 3, bar1, 14);
	this.ctrlctx.fillStyle = 'rgba(130,130,130,0.6)';
	this.ctrlctx.fillRect(10 + bar1, 3, bar2 - bar1, 14);
	this.ctrlctx.fillStyle = 'rgba(100,100,100,0.6)';
	this.ctrlctx.fillRect(10 + bar2, 3, this.barlen - bar2, 14);

	this.drawVolume(this.ctrlctx, this.barlen + 20, 3, this.vollen , 14, this.video.volume);
}

PaView.prototype.roundRect = function(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x, y+r);
	ctx.arc(x+r,   y+w-r, r, Math.PI, Math.PI/2, 1);
	ctx.arc(x+h-r, y+w-r, r, Math.PI/2, 0, 1);
	ctx.arc(x+h-r, y+r,   r, 0, Math.PI*3/2, 1);
	ctx.arc(x+r,   y+r,   r, Math.PI*3/2, Math.PI, 1);
	ctx.closePath();
	ctx.fill();
}

PaView.prototype.triangle = function(ctx, x, y, w, h) {
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + w, y + h / 2);
	ctx.lineTo(x, y + h);
	ctx.closePath();
	ctx.fill();
}

PaView.prototype.drawVolume = function(ctx, x, y, w, h, val) {
	this.ctrlctx.clearRect(x, y, w, h);
	this.ctrlctx.fillStyle = 'rgba(0,0,0,0.7)';
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x, y + h);
	ctx.lineTo(x + w, y);
	ctx.closePath();
	ctx.fill();
	this.ctrlctx.fillStyle = 'rgba(220,220,220,0.6)';
	ctx.beginPath();
	ctx.moveTo(x, y + h);
	ctx.lineTo(x + w * val, y + h);
	ctx.lineTo(x + w * val, y + h * (1 - val));
	ctx.closePath();
	ctx.fill();
	this.ctrlctx.fillStyle = 'rgba(100,100,100,0.6)';
	ctx.beginPath();
	ctx.moveTo(x + w * val, y + h);
	ctx.lineTo(x + w * val, y + h * (1 - val));
	ctx.lineTo(x + w, y);
	ctx.lineTo(x + w, y + h);
	ctx.closePath();
	ctx.fill();

}


///////// main process
PaView.prototype.show = function() {
	var self = this;

	// div
	this.element = document.getElementById(this.id);
	this.element.style.width = this.width + 'px';
	this.element.style.height = this.height + 'px';
	this.element.style.cursor = 'default';
	if ((this.element.style.position !== 'absolute')
	&&  (this.element.style.position !== 'fixed')) {
		this.element.style.position = 'relative';
	}

	this.element.onmouseover = function() {
		self.ctrl.style.display = 'block';
		self.fading = false;
	};
	this.element.onmouseleave = function() {
		self.fading = true;
		self.fadeoutCtrlBar();
	};

	this.info = document.getElementById('paviewinfo');


	// スタートボタン
	this.btn = document.createElement('canvas');
	this.btn.id = 'paview_btn';
	this.btn.style.position = 'absolute';

	// スタートボタンの位置
	var size_x = 200;
	var size_y = size_x * 80 / 120;
	this.btn.style.left = ((this.width - size_x) / 2).toFixed() + 'px'; 
	this.btn.style.top = ((this.height - size_y) / 2).toFixed() + 'px';
	this.btn.style.display = 'block';
	this.btn.width = size_x;
	this.btn.height = size_y;

	// スタートボタンの角丸四角形
	this.btnctx = this.btn.getContext('2d');
	this.btnctx.fillStyle = 'rgba(180,180,180,0.6)';
	this.roundRect(this.btnctx, 0, 0, size_y, size_x, size_x / 8);

	// スタートボタンの三角形
	this.btnctx.fillStyle = 'rgba(255,255,255,0.7)';
	this.triangle(this.btnctx, size_x * 0.25, size_y * 0.15, size_x * 0.5, size_y * 0.7);
	this.element.appendChild(this.btn);



	// 戻るボタン
	this.backbtn = document.createElement('canvas');
	this.backbtn.id = 'paview_backbtn';
	this.backbtn.style.position = 'absolute';

	// 戻るボタンの位置
	size_x = 50;
	size_y = size_x * 110 / 120;
	this.backbtn.style.left = (size_x * 0.2).toFixed() + 'px'; 
	this.backbtn.style.top = (size_x * 0.2).toFixed() + 'px';
	this.backbtn.style.display = 'block';
	this.backbtn.width = size_x;
	this.backbtn.height = size_y;

	// 戻るボタンの角丸四角形
	this.backbtnctx = this.backbtn.getContext('2d');
	this.backbtnctx.fillStyle = 'rgba(180,180,180,0.6)';
	this.roundRect(this.backbtnctx, 0, 0, size_y, size_x, size_x / 8);

	// 戻るボタンの三角形
	this.backbtnctx.fillStyle = 'rgba(255,255,255,0.7)';
	this.roundRect(this.backbtnctx, size_x * 0.4, size_y * 0.35, size_y * 0.3, size_x * 0.4, 0);
	this.triangle(this.backbtnctx, size_x * 0.4, size_y * 0.15, size_x * -0.3, size_y * 0.7);
	this.element.appendChild(this.backbtn);




	// bottom bar
	this.ctrl = document.createElement('canvas');
	this.ctrl.id = 'paviewctrl';
	this.ctrl.style.position = 'absolute';
	this.ctrl.style.left = '0px'; 
	this.ctrl.style.top = (this.height - 20) + 'px';
	this.ctrl.style.display = 'none';
	this.ctrl.width = this.width;
	this.ctrl.height = 20;
	this.ctrlctx = this.ctrl.getContext('2d');
	this.ctrlctx.fillStyle = 'rgba(0,0,0,0.7)';
	this.ctrlctx.fillRect(0,0,this.width,20);
	this.vollen = 60;
	this.barlen = this.width - this.vollen - 20 - 10;

	this.ignoreEvent = false;
	this.ctrl.onmousedown = function(e) {
		if (self.isTouchDevice) {
			e.preventDefault();
			return;
		}
		self.ctlDownCallback(e.layerX);
		e.preventDefault();
	};
	this.ctrl.onmouseup = function(e) {
		if (self.isTouchDevice) {
			e.preventDefault();
			return;
		}
		self.ctlUpCallback(e.layerX);
		e.preventDefault();
	};

	this.ctrl.addEventListener('touchstart', function(e) {
		self.isTouchDevice = true;
		self.ctlDownCallback(e.changedTouches[0].clientX);
		e.preventDefault();
	});

	this.ctrl.addEventListener('touchend', function(e) {
		self.ctlUpCallback(e.changedTouches[0].clientX);
		e.preventDefault();
	});

	this.ctlDownCallback = function(px)
	{
		self.ignoreEvent = true;
		var videopos = (px - 10) / self.barlen;
		if ((videopos >= 0.0) && (videopos <= 1.0)) {
			self.seekwait = 20;
			self.drawCtrlBar(videopos);
		}
		var volumepos = (px - self.barlen - 20);
		var volume = -1;
		if ((volumepos >= -10) && (volumepos <= 0)) {
			volume = 0;
		} else if ((volumepos > 0) && (volumepos < self.vollen)) {
			volume = volumepos / self.vollen;
		} else if ((volumepos >= self.vollen) && (volumepos <= self.vollen + 10)) {
			volume = 1;
		}
		if (volume >= 0) {
			self.video.volume = volume;
		}
	};

	this.ctlUpCallback = function(px)
	{
		// video seek
		var videopos = (px - 10) / self.barlen;
		if ((videopos >= 0.0) && (videopos <= 1.0)) {
			console.log('seek');
			self.video.currentTime = self.video.duration * videopos;
			self.wsOsc.send('/mv/seek', 'f', self.video.currentTime);
		}
	};


	this.element.appendChild(this.ctrl);

	///////// RENDERER
	var renderer;
	if (this.rendererType == 0)
		renderer = new THREE.WebGLRenderer({ antialias:true });
	else if (this.rendererType == 1)
		renderer = new THREE.CanvasRenderer({ antialias:true });
	else
		renderer = new THREE.CSS3DRenderer({ antialias:true });
	renderer.setSize(this.width, this.height);
	renderer.setClearColor(0x000000, 1);
	this.element.appendChild(renderer.domElement);	// append to <DIV>

	///////// callback setting
	this.element.onmousedown = function(e) {
		if (self.isTouchDevice) return;
		//console.log('onmousedown');
		self.elemDownCallback(e.pageX, e.pageY);
	};

	document.onmouseup = function(e) {
		if (self.isTouchDevice) return;
		//console.log('onmouseup');
		self.elemUpCallback(e.pageX, e.pageY);
	};

	this.element.onmousemove = function(e) {
		self.rotateCamera(e.pageX, e.pageY);
	};

	this.element.addEventListener('touchstart', function(e) {
		//console.log('touchstart');
		self.isTouchDevice = true;
		self.elemDownCallback(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
	});

	this.element.addEventListener('touchend', function(e) {
		//console.log('touchend');
		self.elemUpCallback(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
	});


	this.elemDownCallback  = function(px, py) {
		if (self.ignoreEvent) {
			self.ignoreEvent = false;
			return;
		}
		self.mousedown = true;
		self.mouseDownPos = {x:px, y:py};
		self.oldPosition =  {x:px, y:py};
		self.element.style.cursor = 'move';
	};

	this.elemUpCallback  = function(px, py) {
		self.element.style.cursor = 'default';
		if ((self.mousedown) && (px === self.mouseDownPos.x) && (py === self.mouseDownPos.y)) {
			if (!self.playing) {
				if ((px < self.backbtn.width * 1.5) && (py < self.backbtn.height * 1.5)) {
					self.wsOsc.send('/mv/menu', 's', '');
					window.location.href = "index.html";
					return;
				}
			}
			self.pause();
		}
		self.mousedown = false;
	};


	// chrome / safari / IE
	this.element.onmousewheel = function(e) {
		var delta = e.deltaY ? e.deltaY : e.wheelDelta ? -e.wheelDelta : -e.wheelDeltaY * 0.2;
		self.zoomCamera(delta);
		e.preventDefault();
	};
	// firefox
	this.element.addEventListener("DOMMouseScroll", function(e) {
		self.zoomCamera(e.detail * 5);
		e.preventDefault();
	});
	// iOS
	window.addEventListener("deviceorientation", function(e){
		if (e.alpha) {
			self.setCameraDir(self.d2r(e.alpha), self.d2r(e.beta), self.d2r(e.gamma));
		}
	});

	///////// SCENE
	var scene = new THREE.Scene();

	///////// CAMERA
	this.camera = new THREE.PerspectiveCamera(this.zoom, this.width / this.height);
	this.camera.position = new THREE.Vector3(0, 0, 0);
	this.camera.lookAt(this.cameraDir);
	scene.add(this.camera);

	///////// LIGHT
	var light = new THREE.AmbientLight(0xffffff);
	scene.add(light);

	///////// SPHERE
	var geometry = new THREE.SphereGeometry(100, 32, 16);

	///////// VIDEO
	this.video = document.createElement('video');
	var src = this.file;
	var ua = window.navigator.userAgent.toLowerCase();
//	if ((ua.indexOf('firefox') != -1) && (ua.indexOf('mac os') != -1)) {
//		src = src.replace(/\.mp4/, '.webm');
//	}
	this.video.src = src;
	this.video.loop = false;
	this.video.load();
	this.video.volume = 0.7;

	// pause/restart
	this.playing = false;
	document.onkeydown = function (e) {
		if (e.keyCode === 0x20) {	// space key
			self.pause();
			e.preventDefault();
		}
	};

	// video end event
	this.video.addEventListener("ended", function(){
		window.location.href = "index.html";
		//setTimeout(function() {
			//self.pause();
			//self.video.currentTime = 0;
			// index.htmlへ戻る
		//}, 1000);
	}, false);

	var videoCanvas = document.createElement('canvas');
	videoCanvas.width = this.srcwidth;
	videoCanvas.height = this.srcheight;

	var videoContext = videoCanvas.getContext('2d');
	videoContext.fillStyle = '#000000';
	videoContext.fillRect(0, 0, videoCanvas.width, videoCanvas.height);

	///////// TEXTURE
	var texture = new THREE.Texture(videoCanvas);
	texture.flipY = false;

	///////// MATERIAL
	var material = new THREE.MeshBasicMaterial({
		map: texture,
		overdraw: true,
		side:THREE.DoubleSide});

	///////// MESH
	this.mesh = new THREE.Mesh(geometry, material);
	if (this.rendererType == 0)
		this.mesh.rotation.x = Math.PI;
	this.mesh.rotation.x += this.degree[0];
	this.mesh.rotation.y += this.degree[1];
	this.mesh.rotation.z += this.degree[2];
	scene.add(this.mesh);

	///////// Draw Loop
	function render() {
		requestAnimationFrame(render);
		if (self.video.readyState === self.video.HAVE_ENOUGH_DATA) {
			videoContext.drawImage(self.video, 0, 0);
			if (texture) {
				texture.needsUpdate = true;
			}
			if (self.seekwait > 0) {
				self.seekwait--;
			} else {
				self.drawCtrlBar();
			}
		}
		renderer.render(scene, self.camera);
	};
	render();
}
