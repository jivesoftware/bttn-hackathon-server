var jive = require('jive-sdk');
var q = require('q');

exports.bttns = jive.service.options['bttns'];

exports.doRegister = function(data) {
  var bttn = data['bttn'];
  var callback = data['callback'];
  var clientID = data['clientID'];

          /***
            %bttn% : {
              listeners : {
                %callback% : {
                  clientID : %clientID%
                  callback : %callback%
                }
              }
            }
          ***/

  jive.logger.debug('doRegister:',bttn,callback,clientID);
  
  var deferred = q.defer();
  var db = jive.context.persistence;
  
  /*** CHECK FOR RECORDS ***/
  db.findByID('bttnListeners',bttn)
  .then( 
    function (found) { 
      if (found) {
        jive.logger.debug('Found ['+bttn+'] ...');     
        /*** FOUND ***/
        if (found['listeners'][callback]) {
          /*** IGNORE REQUEST, BTTN ALREADY REGISTERED ***/
          deferred.resolve({ code : 200, message : 'Listener ['+callback+'] for ['+bttn+'], already exists' });                
        } else {
          /*** ADD LISTENER TO BTTN ***/
          found['listeners'][callback] = {
            clientID : clientID,
            callback : callback
          };
          /*** SAVE CHANGES ***/
          db.save('bttnListeners', bttn, found).then(
            function() {
              jive.logger.debug('Succesfully Registered Listener['+callback+'] for ['+bttn+'] ... It may take up to 1 minute for events to start broadcasting.');
              deferred.resolve({ code : 201, message : 'Succesfully Registered Listener['+callback+'] for ['+bttn+']' });
            }
          );
        } // end if
      } else {
        jive.logger.debug('Did Not Find ['+bttn+'] ...');     
        var json = {};
        json.listeners = {};
        json.listeners[callback] = {
            clientID : clientID,
            callback : callback
        };
        /*** SAVE CHANGES ***/
        db.save('bttnListeners', bttn, json).then(
          function() {
            jive.logger.debug('Succesfully Created Listener['+callback+'] for ['+bttn+'] (1st Listener)');
            deferred.resolve({ code : 201, message : 'Succesfully Created Listener['+callback+'] for ['+bttn+']' });
          }
        );
      } // end if
    } // end function
  );     
  
  return deferred.promise;
  
};

exports.doUnregister = function(data) {
  var bttn = data['bttn'];
  var callback = data['callback'];
  var clientID = data['clientID'];

          /***
            %bttn% : {
              listeners : {
                %callback% : {
                  clientID : %clientID%
                  callback : %callback%
                }
              }
            }
          ***/

  var deferred = q.defer();
  var db = jive.context.persistence;
  
  /*** CHECK FOR RECORDS ***/
  db.findByID('bttnListeners',bttn)
  .then( function (found) { 
    if (found['listeners'][callback]) {
      delete found['listeners'][callback];
      /*** SAVE CHANGES ***/
      db.save('bttnListeners', bttn, found).then(
        function() {
          jive.logger.debug('Succesfully Unregistered Listener['+callback+'] for ['+bttn+']');
          deferred.resolve({ code : 201, message : 'Succesfully Unregistered Listener['+callback+'] for ['+bttn+']' });
        }
      );
    } else {
      jive.logger.debug('Succesfully Unregistered Listener['+callback+'] for ['+bttn+']');
      deferred.reject({ code : 404, message : 'Listener['+callback+'] for ['+bttn+'] was not found' });
    } // end if
  });     
  
  return deferred.promise;
}

exports.validateRequest = function(register) {      
  var deferred = q.defer();

  if ( register ) {

    if  (register['callback'] && register['callback'].toLowerCase().indexOf('http') == 0) {

      if (register['bttn'] && this.bttns[register['bttn'].toLowerCase().trim()]) {
         jive.logger.debug('Validated Request:',register['callback'].toLowerCase().trim(),register['bttn'].toLowerCase().trim(),register['clientID']);
         deferred.resolve(
           { 
             bttn : register['bttn'].toLowerCase().trim(), 
             callback : register['callback'].toLowerCase().trim(), 
             clientID : register['clientID'] 
           }         
         );
        } else {
          //*** INVALID bttn NAME    
          deferred.reject({ code : 400, message : 'Invalid bttn name: '+register['bttn'] });
        } // end if
    } else {
      //*** INVALID callback
      deferred.reject({ code : 400, message : 'Invalid callback value and/or format' });
    } // end if
  } else {
    //*** INVALID register request
    deferred.reject({ code : 400, message : 'Invalid bttn listener registration.  Invalid body.' });
  } // end if
  
  return deferred.promise;
};
