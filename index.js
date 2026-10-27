import express from 'express'
import pg from 'pg'
import Joi from 'joi'

const app = express()
const port = 3000
const { Pool } = pg

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mahasiswa',
    password: 'Admin123',
    port: 5432,
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

//Middleware
app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
        const duration = Date.now() - start
        console.log({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`
        })
    })
    next()
})

//Repone Envelope
function successResponse(res, message, data, status = 200) {
    return res.status(status).json({
        status: "true",
        message,
        data,
        error: null
    })
}

function errorResponse(res, message, status, details = null) {
    return res.status(status).json({
        status: "false",
        message,
        data: null,
        error: details
    })
}

//Joi Validation
const biodataSchema = Joi.object({
    id: Joi.number().integer().positive(),
    nama: Joi.string().trim().min(2).max(100).required(),
    nim: Joi.string().trim().length(10).required(),
    kelas: Joi.string().trim().min(2).max(20).required(),
})

const idschema = Joi.object({
    id: Joi.number().integer().positive().required()
})

//Middleware Validation Body
function validateBody(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            allowUnknown: true
        })
        if (error) {
            return errorResponse(
                res,
                "Validation Error",
                400,
                error.details.map(item => ({
                    field: item.path.join('.'),
                    message: item.message
                }))
            )
        }
        req.body = value
        next()
    }
}

//Middleware Validation Params
function validateParams(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            allowUnknown: true
        })
        if (error) {
            return errorResponse(
                res,
                "Validation Error",
                400,
                error.details.map(item => ({
                    field: item.path.join('.'),
                    message: item.message
                }))
            )
        }
        req.params = value
        next()
    }
}

//Method GET
app.get('/', async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM biodata ORDER BY id'
    )
    return successResponse(res, "Data retrieved successfully", result.rows)
})

//Method Post
app.post(
    '/biodata',
    validateBody(biodataSchema),
    async (req, res) => {
        const { id, nama, nim, kelas } = req.body

        const result = await pool.query(
            'INSERT INTO biodata (id, nama, nim, kelas) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, nama, nim, kelas]
        )
        return successResponse(res, "Data inserted successfully", result.rows[0], 201)
    }
)

//Methodt PUT
app.put(
    '/biodata/:id',
    validateParams(idschema),
    validateBody(biodataSchema.fork(
        ['nama', 'nim', 'kelas'],
        field => field.required()
    ).fork(['id'], field => field.forbidden())),
    async (req, res) => {
        const { id } = req.params
        const { nama, nim, kelas } = req.body

        const result = await pool.query(
            'UPDATE biodata SET nama = $1, nim = $2, kelas = $3 WHERE id = $4 RETURNING *',
            [nama, nim, kelas, id]
        )

        if (result.rowCount === 0) {
            return errorResponse(
                res,
                "Data not found",
                404)
        }

        return successResponse(
            res,
            "Data updated successfully",
            result.rows[0])
    }
)

//Method DELETE
app.delete(
    '/biodata/:id',
    validateParams(idschema),
    async (req, res) => {
        const { id } = req.params
        const result = await pool.query(
            'DELETE FROM biodata WHERE id = $1 RETURNING *',
            [id])

        if (result.rowCount === 0) {
            return errorResponse(
                res,
                "Data not found",
                404)
        }

        return successResponse(
            res,
            "Data deleted successfully",
            result.rows[0])
    }
)

//Route Tidak Di temukan
app.use((req, res) => {
    return errorResponse(
        res,
        "Route not found",
        404)
})

//Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack)
    return errorResponse(
        res,
        "Internal Server Error",
        500
    )
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})