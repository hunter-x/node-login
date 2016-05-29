
var crypto 		= require('crypto');
//var MongoDB 	= require('mongodb').Db;
var dbConfig 	= require('../config').dbConfig;
var r 			= require('rethinkdb');
//var Server 		= require('mongodb').Server;
var moment 		= require('moment');

/* login validation methods */

exports.autoLogin = function(user, pass, callback)
{
	
	console.log("autoLogin: {%s, %s}", user);

 	r.connect({ host: dbConfig.host, port: dbConfig.port}, function(err, connection) {
    if(err) {
      console.log("[ERROR][autoLogin]: %s:%s\n%s", err.name, err.msg, err.message);
      return callback(null);
    }
    r.db("nodelogin").table('accounts').filter({user: user}).run(connection, function(err, cursor) {
      if(err) {
        console.log("[ERROR][autoLogin][filter]: %s:%s\n%s", err.name, err.msg, err.message);
        return callback(null)
      };
    
              cursor.toArray(function(err, o) {
            if(err) {
              console.log("[ERROR][manualLogin]: %s:%s\n%s", err.name, err.msg, err.message);
              release(connection);
            }

            	if (o[0].user != user) {
            		callback('user-not-found');
            		connection.close();
            	}
            
            else if(o[0].pass === pass) {
            callback(o);
          }
          else {
            console.log("[INFO ]: User '%s' found but pass doesn't match", user);
            callback(null);
          }
            });
   
 });
   
  });
}

exports.manualLogin = function(user, pass, callback)
{

	r.connect({ host: dbConfig.host, port: dbConfig.port }, function(err, connection) {
			if (err) {
				console.log("[ERROR][addNewAccount]: %s:%s\n%s", err.name, err.msg, err.message);
		     	callback(err);
		      	return
			}
			 r.db("nodelogin").table('accounts').filter({user: user}).limit(1).run(connection, function(err, cursor) {
      if(err) {
        console.log("[ERROR][manualLogin]: %s:%s\n%s", err.name, err.msg, err.message);
        callback(null);
      }
      else {

       
          cursor.toArray(function(err, o) {
            if(err) {
              console.log("[ERROR][manualLogin]: %s:%s\n%s", err.name, err.msg, err.message);
              release(connection);
            }
            		console.log("o[0].user",o[0].user);
            		console.log('user',user);
            	if (o[0].user != user) {
            		callback('user-not-found');
            		connection.close();
            	}
            
            else {
              validatePassword(pass, o[0].pass, function(err, res) {
                if (res) {
                  callback(null, o);
                }
                else {
                  callback('invalid-password');
                }
                connection.close();
              });              
            }
          });
     
      }
    });


	})
}

/* record insertion, update & deletion methods */

exports.addNewAccount = function(newData, callback)
{
	r.connect({ host: dbConfig.host, port: dbConfig.port}, function(err, connection) {
  		 if(err) {
		      console.log("[ERROR][addNewAccount]: %s:%s\n%s", err.name, err.msg, err.message);
		      callback(err);
		      return
    	}
    	r.db('nodelogin').table('accounts').filter(function(doc) { return r.or(doc('user').eq(newData.user), doc('email')
    		.eq(newData.email));}).limit(1).run(connection, function(err, cursor) {
        		if(err) {
          			console.log("[ERROR][addNewAccount]: %s:%s\n%s", err.name, err.msg, err.message);
          			
        		}
                else {

                	cursor.toArray(function(err, result) {
            		  if(err) 
            		  	throw err ;
            		 if (result != undefined && result != null && result.length != 0 ) {
            		  		if (result[0].user == newData.user) {                			 	
                  				callback('username-taken');
                			}
                			else if (result[0].email == newData.email){                				 
                  				callback('email-taken');
                			}
                			connection.close(function(err) { if (err) throw err; })

                	 }
                			
					            saltAndHash(newData.pass, function(hash) {
					              newData.pass = hash;
					              // append date stamp when record was created //
					              newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
					              r.db("nodelogin").table('accounts').insert(newData).run(connection, function(err, result) {
					                if(result && result.inserted === 1) {
					                  newData['id'] = result['generated_keys'][0];
					                  callback(null, newData);
					                }
					                else {
					                  console.log("je suis la[ERROR][addNewAccount][insert]: %s:%s\n%s", err.name, err.msg, err.message);
					                  callback(null);
					                }
					                connection.close(function(err) { if (err) throw err; })
					              });
					            }); 
          					
            		});	   
          }
        })
  	    
  	})

  }

exports.updateAccount = function(newData, callback) {
  if (newData.pass === '') {
    delete newData.pass;
        console.log("ssssssssssssssssssssssssssss")

    update(newData, callback);
  }
  else {
    saltAndHash(newData.pass, function(hash) {
      newData.pass = hash;
      update(newData, callback);
    })
  }
}

function update(newUserData, callback) {
  console.log("[DEBUG] update: %j", newUserData);
	r.connect({ host: dbConfig.host, port: dbConfig.port}, function(err, connection) {
    if(err) {
      console.log("[ERROR][update]: %s:%s\n%s", err.name, err.msg, err.message);
      return callback(err);
    }
    
    r.db("nodelogin").table('accounts').filter({user: newUserData.user}).limit(1)
     .update(newUserData)
     .run(connection, function(err, result) {
        if(err) {
          console.log("dddddddddddddddddddddddddd[ERROR][update]: %s:%s\n%s", err.name, err.msg, err.message);
          callback(err.msg);
        }
        else if(result.replaced === 1) {
          callback(null, newUserData);
        }
        else {
          callback(false);
        }
        connection.close();
      }
    )
  });
}

exports.updatePassword = function(email, newPass, callback)
{
	accounts.findOne({email:email}, function(e, o){
		if (e){
			callback(e, null);
		}	else{
			saltAndHash(newPass, function(hash){
		        o.pass = hash;
		        accounts.save(o, {safe: true}, callback);
			});
		}
	});
}

/* account lookup methods */

exports.deleteAccount = function(id, callback)
{
	accounts.remove({_id: getObjectId(id)}, callback);
}

exports.getAccountByEmail = function(email, callback)
{
	accounts.findOne({email:email}, function(e, o){ callback(o); });
}

exports.validateResetLink = function(email, passHash, callback)
{
	accounts.find({ $and: [{email:email, pass:passHash}] }, function(e, o){
		callback(o ? 'ok' : null);
	});
}

exports.getAllRecords = function(callback)
{
	accounts.find().toArray(
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
}

exports.delAllRecords = function(callback)
{
	accounts.remove({}, callback); // reset accounts collection for testing //
}

/* private encryption & validation methods */
var generateSalt = function()
{
	var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
	var salt = '';
	for (var i = 0; i < 10; i++) {
		var p = Math.floor(Math.random() * set.length);
		salt += set[p];
	}
	return salt;
}

var md5 = function(str) {
	return crypto.createHash('md5').update(str).digest('hex');
}

var saltAndHash = function(pass, callback)
{
	var salt = generateSalt();
	callback(salt + md5(pass + salt));
}

var validatePassword = function(plainPass, hashedPass, callback)
{
	var salt = hashedPass.substr(0, 10);
	var validHash = salt + md5(plainPass + salt);
	callback(null, hashedPass === validHash);
}

var getObjectId = function(id)
{
	return new require('mongodb').ObjectID(id);
}

var findById = function(id, callback)
{
	accounts.findOne({_id: getObjectId(id)},
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
}

var findByMultipleFields = function(a, callback)
{
// this takes an array of name/val pairs to search against {fieldName : 'value'} //
	accounts.find( { $or : a } ).toArray(
		function(e, results) {
		if (e) callback(e)
		else callback(null, results)
	});
}
