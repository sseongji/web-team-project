import mongoose from 'mongoose';

console.log(process.env.DB_URL)

mongoose.connect(process.env.DB_URL , {
    useNewUrlParser: true,
    useUnifiedTopology: true,
   
  }, (err)=>{
    if(err) {
      console.log('몽고디비 연결 에러', err)
    } else {
      console.log('몽고디비 연결 성공')
    }
  })


const db = mongoose.connection;

const handleOpen = () => console.log('connected to DB')
const handleError = (error)=> console.log('DB error', error)
db.on('error', handleError) 
db.once('open', handleOpen )

export default connect