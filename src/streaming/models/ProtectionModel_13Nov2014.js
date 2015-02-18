/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright 2015 Mozilla Foundation
 *
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


MediaPlayer.models.ProtectionModel_13Nov2014 = function () {

    var keySystemsCache = Object.create(null);

    function getMediaKeys(id, videoType, initDataType) {
        var cacheKey = id + '-' + videoType + '-' + initDataType;
        if (!keySystemsCache[cacheKey]) {
            // TODO match the options to the spec
            var options = [
                {
                  initDataType: initDataType,
                  videoType: videoType,
                }
            ];
            keySystemsCache[cacheKey] = navigator.requestMediaKeySystemAccess(id, options).
                    then(function (keySystem) {
                return keySystem.createMediaKeys();
            });
        }
        return keySystemsCache[cacheKey];
    }

    var videoElement = null,
        mediaKeys = null,

        // API names object selected for this user agent
        api = MediaPlayer.models.ProtectionModel_13Nov2014.API,

        // Session list
        sessions = [],

        // This is our main event handler for all desired HTMLMediaElement events
        // related to EME.  These events are translated into our API-independent
        // versions of the same events
        createEventHandler = function() {
            var self = this;
            return {
                handleEvent: function(event) {
                    switch (event.type) {

                        case api.needkey:
                          // Clone event's data for async use
                          var initData = new Uint8Array(new Uint8Array(event.initData)).buffer;
                          var initDataType = event.initDataType;
                          self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY,
                              new MediaPlayer.vo.protection.NeedKey(initData, initDataType));
                          break;
                    }
                }
            };
        },
        eventHandler = null,

        // Function to create our session token objects which manage the EME
        // MediaKeySession and session-specific event handler
        createSessionToken = function(keySession, initData) {
            var self = this;
            return {
                prototype: (new MediaPlayer.models.SessionToken()).prototype,
                session: keySession,
                sessionID: keySession.sessionId,
                initData: initData,

                // This is our main event handler for all desired MediaKeySession events
                // These events are translated into our API-independent versions of the
                // same events
                handleEvent: function(event) {
                    switch (event.type) {

                        case api.error:
                            var errorStr = "KeyError"; // TODO: Make better string from event
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR,
                                    new MediaPlayer.vo.protection.KeyError(this, errorStr));
                            break;

                        case api.message:
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE,
                                    new MediaPlayer.vo.protection.KeyMessage(this, event.message, event.destinationURL));
                            break;

                        case api.ready:
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED,
                                    this);
                            break;

                        case api.close:
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED,
                                    this);
                            break;
                    }
                }
            };
        };

    return {
        system: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        protectionExt: undefined,
        keySystem: null,
        async: true,

        setup: function() {
            eventHandler = createEventHandler.call(this);
        },

        /**
         * Initialize this protection model
         */
        init: function() {
        },

        teardown: function() {
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler);
            }
            for (var i = 0; i < sessions.length; i++) {
                this.closeKeySession(sessions[i]);
            }
        },

        isSupported: function(keySystem, contentType) {
            throw new Error('Not implemented');
        },

        isSupportedAsync: function(keySystem, contentType, initDataType) {
            return getMediaKeys(keySystem.systemString, contentType, initDataType).then(function (mediaKeys) {
              return keySystem;
            }, function (reason) {
              return null;
            })
        },

        selectKeySystem: function(keySystem) {
            throw new Error('Not implemented');
        },

        selectKeySystemAsync: function (keySystem, contentType, initDataType) {
            this.keySystem = keySystem;
            return getMediaKeys(keySystem.systemString, contentType, initDataType).then(function (mediaKeys_) {
                mediaKeys = mediaKeys_;
                if (videoElement) {
                    videoElement.setMediaKeys(mediaKeys);
                }
            });
        },

        setMediaElement: function(mediaElement) {
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler().bind(this));
            }
            videoElement = mediaElement;
            videoElement.addEventListener(api.needkey, eventHandler);
            if (mediaKeys) {
                videoElement.setMediaKeys(mediaKeys);
            }
        },

        createKeySession: function(initData, contentType, initDataType) {

            if (!this.keySystem || !mediaKeys) {
                throw new Error("Can not create sessions until you have selected a key system");
            }

            // TODO: Need to check for duplicate initData.  If we already have
            // a KeySession for this exact initData, we shouldn't create a new session.

            var session = mediaKeys.createSession();
            var sessionToken = createSessionToken.call(this, session, initData);

            // Add all event listeners
            session.addEventListener(api.error, sessionToken);
            session.addEventListener(api.message, sessionToken);
            session.addEventListener(api.ready, sessionToken);
            session.addEventListener(api.close, sessionToken);

            session.generateRequest(initDataType, initData);

            // Add to our session list
            sessions.push(sessionToken);

            return sessionToken;
        },

        updateKeySession: function(sessionToken, message) {

            var session = sessionToken.session;

            if (!this.protectionExt.isClearKey(this.keySystem)) {
                // Send our request to the key session
                session.update(message);
            } else {
                // For clearkey, message is a MediaPlayer.vo.protection.ClearKeyKeySet
                session.update(message.toJWKBytes());
            }
        },

        /**
         * Close the given session and release all associated keys.  Following
         * this call, the sessionToken becomes invalid
         *
         * @param sessionToken the session token
         */
        closeKeySession: function(sessionToken) {

            var session = sessionToken.session;

            // Remove event listeners
            session.removeEventListener(api.error, sessionToken);
            session.removeEventListener(api.message, sessionToken);
            session.removeEventListener(api.ready, sessionToken);
            session.removeEventListener(api.close, sessionToken);

            // Remove from our session list
            for (var i = 0; i < sessions.length; i++) {
                if (sessions[i] === sessionToken) {
                    sessions.splice(i,1);
                    break;
                }
            }

            // Send our request to the key session
            session[api.release]();
        }
    };
};

// Defines the supported 3Feb2014 API variations
MediaPlayer.models.ProtectionModel_13Nov2014.API =
    // Un-prefixed as per spec
    {
        // Video Element
        setMediaKeys: "setMediaKeys",

        // MediaKeys
        MediaKeys: "MediaKeys",

        // MediaKeySession
        release: "close",

        // Events
        needkey: "encrypted",
        error: "keyerror",
        message: "message",
        ready: "keystatuseschange",
        close: "keyclose"
    };

/**
 * Detects presence of EME v14Nov2014 APIs
 *
 * @param videoElement {HTMLMediaElement} the media element that will be
 * used for detecting APIs
 * @returns an API object that is used when initializing the ProtectionModel
 * instance
 */
MediaPlayer.models.ProtectionModel_13Nov2014.detect = function(videoElement) {
    if (typeof navigator.requestMediaKeySystemAccess !== 'function') {
      return false;
    }
    if (typeof videoElement.setMediaKeys !== 'function') {
      return false;
    }
    if (typeof window.MediaKeys !== 'function')  {
      return false;
    }

    return true;
};

MediaPlayer.models.ProtectionModel_13Nov2014.prototype = {
    constructor: MediaPlayer.models.ProtectionModel_13Nov2014
};

