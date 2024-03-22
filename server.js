const http = require('http');
const socketIO = require('socket.io');
const mysql = require('mysql');


//const hostname = '127.0.0.1';
const port = process.env.PORT ||3000;

const server = http.createServer();
const io = socketIO(server);
var crashPosition = 1;
var finalcrash = 0;
var fly;
var betamount =0;
var clients = [];

const connection = mysql.createConnection({
  host: '192.187.112.106',
  user: 'tncpsl_bk',
  password: 'tncpsl_bk',
  database: 'tncpsl_bk'
});

//Function to set crash point
function setcrash() {
  const query9 = `SELECT SUM(amount) AS total FROM crashbetrecord WHERE status ='pending'`;
  connection.query(query9, (err, result) => {
    if (err) {
      console.error('Error adding record to database:', err);
    }else{
      if(result[0].total==null){
        betamount =0;
      }else{
        betamount=result[0].total;
      }
     
     if(betamount==0){
      finalcrash =Math.floor(Math.random() * 6) + 2;
      console.log('finalcrash0');
      console.log(finalcrash,betamount);
      repeatupdate(200);
     }else if(betamount<=10){
      finalcrash =(Math.random() * 0.5 + 1).toFixed(2); 
      console.log('finalcrash100');
      console.log(finalcrash,betamount);
      repeatupdate(300);
     }else{
      finalcrash =(Math.random()* 0.5  + 1).toFixed(2); 
      console.log('finalcrash12');
      console.log(finalcrash,betamount);
      repeatupdate(200);
     }
    }
  });
  
}

// Function to reset plane
function restartplane() {
  clearInterval(fly);
  console.log("reset............");
  console.log('crashsite');
  console.log(crashPosition);
  const query5 = `INSERT INTO crashgamerecord (crashpoint) VALUES ('${crashPosition}')`;

  connection.query(query5, (err, result) => {
    if (err) {
      console.error('Error adding record to database:', err);
    } 
  });
  io.emit('updatehistory', crashPosition);

  setTimeout(() => {
    const query4 = `UPDATE crashbetrecord SET status = 'fail',winpoint='${crashPosition}' WHERE status = 'pending'`;

    connection.query(query4, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      } 
    });
    io.volatile.emit('reset', 'resetting plane.....');

  }, 200);

  setTimeout(() => {
    io.emit('removecrash');
    setTimeout(() => {
      // check if there are clients connected    
      io.emit('prepareplane');
      crashPosition = 0.99;
      io.emit('flyplane');
     
      setTimeout(() => {
      setcrash();
    },1000)
    }, 4000)
  }, 3000)

}
// Function to update crash multiplier
function updateCrashInfo() {
  var fc=parseFloat(finalcrash) ;
  var cp=parseFloat(crashPosition);
  if ( fc > cp ) {
    var cPosition = parseFloat(crashPosition);
    crashPosition=(cPosition+0.03).toFixed(2);
    io.emit('crash-update', crashPosition);
  } else {
    restartplane();
  }
}


// Function to repeatedly update crash data
function repeatupdate(duration) {
  fly = setInterval(updateCrashInfo, duration);
}

io.on('connection', (socket) => {
  console.log('A user connected');
  clients.push(socket.id);
  socket.emit('working', 'ACTIVE...!');

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('newBet', function (username, amount) {
    
    const bal = `SELECT balance From users  WHERE username = '${username}'`;
    connection.query(bal, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      }else{
        if(result[0].balance>amount){
          const query1 = `UPDATE users SET balance = balance - ${amount} WHERE username = '${username}'`;

          connection.query(query1, (err, result) => {
            if (err) {
              console.error('Error adding record to database:', err);
            } 
          });
          const query = `INSERT INTO crashbetrecord (username, amount) VALUES ('${username}', ${amount})`;
      
          connection.query(query, (err, result) => {
            if (err) {
              console.error('Error adding record to database:', err);
            } 
          });
        }
      }
    });
  });
  socket.on('addWin', function (username, amount, winpoint) {
    const bets = `SELECT SUM(amount) AS bets FROM crashbetrecord WHERE status ='pending' AND username = '${username}'`;
    connection.query(bets, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      }else{
        if(result[0].bets>0){
          console.log("winner");
    var winamount=parseFloat(amount*winpoint);
    winamount=winamount.toFixed(2);
    console.log(winamount);
    const query2 = `UPDATE users SET balance = balance + ${winamount} WHERE username = '${username}'`;

    connection.query(query2, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      }
    });
    const query3 = `UPDATE crashbetrecord SET status = 'success', winpoint='${winpoint}' WHERE username = '${username}'  AND status = 'pending'`;

    connection.query(query3, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      } 
    });
        }
      }
    });
    

  });
});
setcrash();
server.listen(port,  () => {
  console.log(`Server running at :${port}/`);
});
