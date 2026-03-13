const express = require('express')
const cors = require('cors')
const uploadRoute = require('./routes/upload')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use('/api', uploadRoute)

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
