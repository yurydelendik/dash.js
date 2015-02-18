/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014-2015, Cable Television Laboratories, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Cable Television Laboratories, Inc. nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * A collection of ClearKey encryption keys with an (optional) associated
 * type
 *
 * @param keyPairs {MediaPlayer.vo.protection.KeyPair[]} array of key pairs
 * @param type the type of keys in this set.  One of either 'persistent'
 * or 'temporary'.  Can also be null or undefined.
 * @constructor
 */
MediaPlayer.vo.protection.ClearKeyKeySet = function(keyPairs, type) {
    if (type && type !== "persistent" && type !== "temporary")
        throw new Error("Invalid ClearKey key set type!  Must be one of 'persistent' or 'temporary'");
    this.keyPairs = keyPairs;
    this.type = type;

    /**
     * Convert this key set to its JSON Web Key (JWK) representation
     */
    this.toJWKString = function() {
        var i, numKeys = this.keyPairs.length,
            retval = {};
        retval.keys = [];
        for (i = 0; i < numKeys; i++) {
            var key = {
                kty: "oct",
                alg: "A128KW"
            };
            // Remove base64 padding from each
            key.k = btoa(String.fromCharCode.apply(null, this.keyPairs[i].key)).replace(/=/g, "");
            key.kid = btoa(String.fromCharCode.apply(null, this.keyPairs[i].keyID)).replace(/=/g, "");
            retval.keys.push(key);
        }
        if (this.type) {
            retval.type = this.type;
        }

        return JSON.stringify(retval);
    };

    this.toJWKBytes = function() {
        var str = this.toJWKString();
        var arr = new ArrayBuffer(str.length);
        var view = new Uint8Array(arr);
        for (var i = 0; i < str.length; i++) {
            view[i] = str.charCodeAt(i);
        }
        return arr;
    };
};

MediaPlayer.vo.protection.ClearKeyKeySet.prototype = {
    constructor: MediaPlayer.vo.protection.ClearKeyKeySet
};

MediaPlayer.vo.protection.ClearKeyKeySet.decode = function (message) {
  function arrayBufferToString(arr) {
    var str = '';
    var view = new Uint8Array(arr);
    for (var i = 0; i < view.length; i++) {
      str += String.fromCharCode(view[i]);
    }
    return str;
  }

  function stringToArrayBuffer(str) {
    var arr = new ArrayBuffer(str.length);
    var view = new Uint8Array(arr);
    for (var i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i);
    }
    return arr;
  }

  var msgStr = arrayBufferToString(message);
  var msg = JSON.parse(msgStr);
  var keyPairs = [];

  for (var i = 0; i < msg.kids.length; i++) {
    var idBin = window.atob(msg.kids[i].replace(/-/g, "+").replace(/_/g, "/"));
    var keyid = new Uint8Array(stringToArrayBuffer(idBin));
    keyPairs.push(new MediaPlayer.vo.protection.KeyPair(keyid, new Uint8Array(16)));
  }
  return new MediaPlayer.vo.protection.ClearKeyKeySet(keyPairs, msg.type);
};
