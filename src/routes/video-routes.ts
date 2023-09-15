import { FastifyInstance } from "fastify"
import { fastifyMultipart } from "@fastify/multipart"
import path from "path"
import fs from "node:fs"
import { pipeline } from "node:stream"
import { promisify } from "node:util"
import { prisma } from "../lib/prisma"
import { z } from "zod"
import { createReadStream } from "node:fs"
import { openai } from "../lib/openai"

const pump = promisify(pipeline)

export async function uploadVideosRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, //25mb
    },
  })

  function deleteTmpVideos() {
    const filesPath = path.resolve(__dirname, "..", "..", "tmp")
    fs.readdir(filesPath, (err, files) => {
      if (err) throw err

      for (const file of files) {
        fs.unlink(path.join(filesPath, file), (err) => {
          if (err) throw err
        })
      }
    })
  }

  app.post("/videos/upload", async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" })
    }

    const extension = path.extname(data.filename)

    if (extension !== ".mp3") {
      return reply.status(400).send({ error: "Invalid file type" })
    }

    const fileName = `${Date.now()}${extension}`
    const uploadPath = path.resolve(__dirname, "..", "..", "tmp", fileName)

    //delete all files in tmp folder
    deleteTmpVideos()
    await pump(data.file, fs.createWriteStream(uploadPath))

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadPath,
      },
    })

    return { video }
  })
}

export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post("/videos/:videoId/transcription", async (request, reply) => {
    const paramsSchema = z.object({
      videoId: z.string().uuid(),
    })
    const { videoId } = paramsSchema.parse(request.params)
    const bodySchema = z.object({
      prompt: z.string(),
    })
    const { prompt } = bodySchema.parse(request.body)

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    })
    if (!video) {
      return reply.status(404).send({ error: "Video not found" })
    }
    if (video.transcription) {
      return video.transcription
    }

    const videoPath = video.path
    const audioReadStream = createReadStream(videoPath)
    const response = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: "pt",
      response_format: "json",
      temperature: 0.5,
      prompt: prompt,
    })

    await prisma.video.update({
      where: { id: videoId },
      data: {
        transcription: response.text,
      },
    })

    return response.text
  })
}

export async function generateAiCompletionRoute(app: FastifyInstance) {
  app.post("/ai/completion", async (req, reply) => {
    const bodySchema = z.object({
      videoId: z.string().uuid(),
      template: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    })
    const { videoId, template, temperature } = bodySchema.parse(req.body)

    const video = await prisma.video.findUniqueOrThrow({
      where: { id: videoId },
    })

    if (!video) {
      return reply.status(404).send({ error: "Video not found" })
    }

    if (!video.transcription) {
      return reply.status(400).send({ error: "Video not transcribed" })
    }

    const promptMessage = template.replace(
      "{transcription}",
      video.transcription
    )

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      temperature,
      messages: [{ role: "user", content: promptMessage }],
    })

    return response
  })
}
