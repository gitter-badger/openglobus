goog.provide('og.control.Sun');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.LightSource');
goog.require('og.astro.earth');
goog.require('og.math.Quaternion');

/**
 * Real Sun geocentric position control that place the Sun on the right place by the Earth.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Control options.
 */
og.control.Sun = function (options) {
    og.inheritance.base(this, options);

    options = options || {};

    /**
     * Earth planet node.
     * @public
     * @type {og.scene.Planet}
     */
    this.planet = null;

    /**
     * Sunlight position placed in the camera eye.
     * @private
     * @type {boolean}
     */
    //this._isCameraSunlight = false;

    this.offsetVertical = options.offsetVertical || -5000000;

    this.offsetHorizontal = options.offsetHorizontal || 5000000;

    /**
     * Light source.
     * @public
     * @type {og.LightSource}
     */
    this.sunlight = null;

    /**
     * Current frame handler clock date and time.
     * @private
     * @type {Number}
     */
    this._currDate = 0;

    /**
     * Previous frame handler clock date and time.
     * @private
     * @type {Number}
     */
    this._prevDate = 0;

    this._clockPtr = null;

    this._lightOn = false;

    this._stopped = options.stopped || false;
};

og.inheritance.extend(og.control.Sun, og.control.BaseControl);

og.control.sun = function (options) {
    return new og.control.Sun(options);
};

og.control.Sun.prototype.oninit = function () {

    this.planet.lightEnabled = true;

    //sunlight initialization
    this.sunlight = new og.LightSource("Sun", {
        'ambient': new og.math.Vector3(0.15, 0.15, 0.25),
        'diffuse': new og.math.Vector3(0.9, 0.9, 0.8),
        'specular': new og.math.Vector3(0.1, 0.1, 0.06),
        'shininess': 110
    });
    this.sunlight.addTo(this.planet);

    var that = this;
    this.renderer.events.on("draw", this._draw, this);

    this.renderer.events.on("charkeypress", og.input.KEY_L, function () {
        that.planet.lightEnabled = !that.planet.lightEnabled;
    });

    if (!this._clockPtr)
        this._clockPtr = this.renderer.handler.defaultClock;
};

og.control.Sun.prototype.stop = function () {
    this._stopped = true;
};

og.control.Sun.prototype.onactivate = function () {
    this._stopped = false;
};

og.control.Sun.prototype.bindClock = function (clock) {
    this._clockPtr = clock;
};

og.control.Sun.prototype._draw = function () {
    if (!this._stopped) {
        this._currDate = this._clockPtr.currentDate;
        var cam = this.renderer.activeCamera;
        if (cam.getHeight() < 4650000 || !this._active) {
            this._lightOn = true;
            this._f = 1;
            var n = cam.eye.normal();
            var tu = og.math.Vector3.proj_b_to_plane(cam._v, n, cam._v).normalize().scale(this.offsetVertical);
            var tr = og.math.Vector3.proj_b_to_plane(cam._u, n, cam._u).normalize().scale(this.offsetHorizontal);
            var d = tu.add(tr);
            var pos = cam.eye.add(d);
            if (this._k > 0) {
                this._k -= 0.01;
                var rot = og.math.Quaternion.getRotationBetweenVectors(this.sunlight._position.normal(), pos.normal());
                var r = rot.slerp(og.math.Quaternion.IDENTITY, this._k).normalize();
                this.sunlight.setPosition(r.mulVec3(this.sunlight._position));
            } else {
                this.sunlight.setPosition(pos);
            }
        } else {
            this._k = 1;
            if (this._f > 0) {
                this._f -= 0.01;
                var rot = og.math.Quaternion.getRotationBetweenVectors(this.sunlight._position.normal(), og.astro.earth.getSunPosition(this._currDate).normal());
                var r = rot.slerp(og.math.Quaternion.IDENTITY, this._f).normalize();
                this.sunlight.setPosition(r.mulVec3(this.sunlight._position));
            } else {
                if (Math.abs(this._currDate - this._prevDate) > 0.00034 && this._active || this._lightOn) {
                    this._lightOn = false;
                    this._prevDate = this._currDate;
                    this.sunlight.setPosition(og.astro.earth.getSunPosition(this._currDate));
                    this._f = 0;
                }
            }
        }
    }
};

