// The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
//
// Copyright (c) 2013, Microsoft Open Technologies, Inc.
//
// All rights reserved.
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//     -             Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//     -             Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//     -             Neither the name of the Microsoft Open Technologies, Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

MediaPlayer.dependencies.ProtectionController = function () {
    "use strict";

    var keySystems = null,

        onKeyMessage = function(e) {
            if (e.error) {
                this.debug.log(e.error);
            } else {
                var keyMessageEvent = e.data;
                var newLicenseFormat = this.protectionModel.async; // TODO use different check
                this.protectionModel.keySystem.doLicenseRequest(keyMessageEvent.message,
                    keyMessageEvent.defaultURL, keyMessageEvent.sessionToken, newLicenseFormat);
            }
        };

    return {
        system : undefined,
        debug : undefined,
        protectionExt: undefined,

        setup : function () {
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE] = onKeyMessage.bind(this);
        },

        init: function (protectionModel) {
            this.protectionModel = protectionModel;
            keySystems = this.protectionExt.getKeySystems();
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, this);
        },

        teardown: function() {
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, this);
        },

        /**
         * Called in response to a needkey event to auto select a key
         * system based on the media and initialization data
         *
         * @param mediaInfo media information
         * @param initData initialization data
         */
        selectKeySystem : function(mediaInfo, initData) {
            this.protectionExt.autoSelectKeySystem(mediaInfo, initData);
        },

        createKeySession: function(initData, contentType, initDataType) {
            this.protectionModel.createKeySession(initData, contentType, initDataType);
        },

        updateKeySession: function(sessionToken, message) {
            this.protectionModel.updateKeySession(sessionToken, message);
        }
    };

};

MediaPlayer.dependencies.ProtectionController.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionController
};


