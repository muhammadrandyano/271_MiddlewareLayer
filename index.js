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
