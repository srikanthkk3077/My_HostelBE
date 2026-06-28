const axios = require('axios');
axios.put('http://localhost:8000/api/members/6a3f3a163b3dcd977a8b622a/assign', {
  roomNumber: '101',
  bed: 'Bed 1'
}).then(console.log).catch(err => {
  if (err.response) {
    console.log("Status:", err.response.status);
    console.log("Data:", err.response.data);
  } else {
    console.log(err.message);
  }
});
