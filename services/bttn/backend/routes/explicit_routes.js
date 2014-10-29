var jive = require('jive-sdk');
var q = require('q');
var services = require('../services')

exports.processBttnRoot = {
  'path' : '/menu',
  'verb' : 'GET',
  'route': function(req, res) { 
    
      var bttns = [];
      Object.keys(services.bttns).forEach(
        function(key) {
          bttns.push(services.bttns[key]);  
        } // end function
      );
    
      res.render('menu.html', 
        { 
          host : jive.service.serviceURL(),
          bttns : bttns
        }
      );
  }
};

exports.processBttnPing = {
    'path' : '/ping',
    'verb' : 'POST',
    'route': function(req, res) { 

        var theDate = req.body.date;
        var theTime = req.body.time;
        var user = req.body.user;
        var url = req.body.url;
        var name = req.body.name;
        var id = req.body.id;
        var location = req.body.location;
        var color = req.body.color;
      
        jive.logger.debug('bt.tn['+id+'] PING received: ',theDate,theTime,user,url,name,location,color);
        res.status(200).end();
    }
};

exports.processBttnStats = {
    'path' : '/stats',
    'verb' : 'GET',
    'route': function(req, res) { 

        var theDate = req.body.date;
        var theTime = req.body.time;
        var user = req.body.user;
        var url = req.body.url;
        var name = req.body.name;
        var id = req.body.id;
        var location = req.body.location;
        var color = req.body.color;
      
        jive.logger.debug('bt.tn['+id+'] STATS received: ',theDate,theTime,user,url,name,location,color);
        res.status(200).end();
    }
};

exports.processChallengeScreen = {
    'path' : '/challenges',
    'verb' : 'GET',
    'route': function(req, res) { 
        var conf = jive.service.options["challengeScreen"];
        
        var refreshInterval = conf["refreshIntervalSec"];
        var contentHostURL = conf["contentHostURL"];
        var contentResourceURL = conf["contentResourceURL"];
        var enabled = conf["enabled"];

        var now = new Date();

        jive.logger.debug('/challenges : ',contentHostURL,contentResourceURL,refreshInterval);
      
        if (!enabled) {
          res.status(404).end();
        } // end if
      
        function loadContent(resourceURL) {
          var p = q.defer();
          
          jive.util.buildRequest(
            contentHostURL+contentResourceURL,
            'GET',
            {},
            { 'Content-Type': 'application/json' }
          ).then(
            function(response) {
                var body = response['entity'];
                p.resolve(
                  {
                    remoteHost : contentHostURL,
                    id : body['id'],
                    body : body['content']['text'],
                    subject : body['subject'],
                    link : body['resources']['html']['ref']
                  }
                );
            }, // end function
            function(error) {
              jive.logger.error('['+error.statusCode+']');  
              p.reject(error.statusCode);
            }
          );   
          
          return p.promise;
        };
       
        var deferred = q.defer();
      
        loadContent(contentResourceURL).then(
          function(challengeContent) {
            res.render('challenges.html', 
              { 
                host : jive.service.serviceURL(),
                refreshInterval : refreshInterval,
                content : challengeContent,
                timestamp : now
              }
            );
            deferred.resolve();
          },
          function(statusCode) {
            res.status(statusCode);
            deferred.reject();
          }
          );
        return deferred.promise;
    }
};


exports.processRegisterForm = {
    'path' : '/register',
    'verb' : 'GET',
    'route': function(req, res) { 
      
      var bttns = [];
      Object.keys(services.bttns).forEach(
        function(key) {
          bttns.push(services.bttns[key]);  
        } // end function
      );
      
      res.render('register.html', 
        { 
          host : jive.service.serviceURL(),
          bttns : bttns
        }
      );
    }
};

exports.processUnregisterForm = {
    'path' : '/unregister',
    'verb' : 'GET',
    'route': function(req, res) { 

      var bttns = [];
      Object.keys(services.bttns).forEach(
        function(key) {
          bttns.push(services.bttns[key]);  
        } // end function
      );
      
      res.render('unregister.html', 
        { 
          host : jive.service.serviceURL(),
          bttns : bttns
        }
      );
    }
};

exports.processBttnEvent = {
    'path' : '/event',
    'verb' : 'POST',
    'route': function(req, res) { 
      
        var theDate = req.body.date;
        var theTime = req.body.time;
        var user = req.body.user;
        var url = req.body.url;
        var name = req.body.name;
        var id = req.body.id;
        var location = req.body.location;    

        jive.logger.debug('bt.tn['+id+'] EVENT received: ',theDate,theTime,user,url,name,location);
      
        var db = jive.context.persistence;    
      
        db.findByID('bttnListeners',name)
        .then(
          function(bttn) {
            if (bttn) {
              if (bttn['listeners']) {
                Object.keys(bttn['listeners']).forEach(
                  function(key) {
                    var listener = bttn['listeners'][key];
                    var url = listener['callback'];           
                    var bttnDetails = services.bttns[name];

                    jive.logger.debug('Processing ['+url+']...');

                    jive.util.buildRequest(
                      url,
                      'POST',
                      { date : theDate, time : theTime, user : user, url : url, name : name, id : id, location : location, color: bttnDetails['color'] },
                      { 'Content-Type': 'application/json', 'Jive bt.tn Server' : 'true' }
                    ).then(
                      function(response) {
                        jive.logger.debug('['+response.statusCode+'] - '+url);  
                      }, // end function
                      function(error) {
                        jive.logger.error('['+response.statusCode+'] - '+url);  
                      }
                    );                         
                  } // end function
                ); // end forEach
                res.status(200).json({ "result" : "success" });
              } else {
                jive.logger.debug('bttn['+name+'] Found With No Listeners.');
                res.status(200).json({ "result" : "success-no-listeners" });
              } // end if
            } else {
              jive.logger.debug('Unable to find bttn['+name+'].  No listeners fired.');
              res.status(404).json({ "result" : "bttn-listener-not-found" });
            } // end if
          } // end function
        );
    } // end function
};

exports.processBttnListenerRegister = {
    'path' : '/listener',
    'verb' : 'post',
    'route': function(req, res) {
      
      /***
        {
          bttn : %bttn%, (must match bttns json structure key above)
          callback : %callback%, (any url begining with http)
          clientID : %clientID% (any value, not verified or uniqueness check)
        }
      ***/

      services.validateRequest(req.body).then(
        function(data) {
          services.doRegister(data).then(
            function(success) {
              res.status(success.code).send(success.message);
            },
            function (error) {
              jive.logger.debug('Error during Register: :'+error);
              res.status(error.code).send(error.message);
            }
          );
        },
        function (error) {
          jive.logger.debug('Invalid Request: :'+error);
          res.status(error.code).send(error.message);
        }
      );
    } // end function
};

exports.processBttnListenerUnregister = {
    'path' : '/listener',
    'verb' : 'delete',
    'route': function(req, res) {
      
      /***
        {
          bttn : %bttn%, (must match bttns json structure key above)
          callback : %callback%, (any url begining with http)
          clientID : %clientID% (any value, not verified or uniqueness check)
        }
      ***/

      services.validateRequest(req.body).then(
        function(data) {
          services.doUnregister(data).then(
            function(success) {
              res.status(success.code).send(success.message);
            },
            function (error) {
              jive.logger.debug('Error during Unregister: :'+error);
              res.status(error.code).send(error.message);
            }
          );
        },
        function (error) {
          jive.logger.debug('Invalid Request: :'+error);
          res.status(error.code).send(error.message);
        }
      );
      
    }
};