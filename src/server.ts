import { fastify } from "fastify"
import {
  createPromptRoute,
  deletePromptRoute,
  getAllPromptsRoute,
  getPromptByIdRoute,
  updatePromptRoute,
} from "./routes/prompts-routes"
import { createTranscriptionRoute, uploadVideosRoute } from "./routes/video-routes"

const app = fastify()

app.register(getAllPromptsRoute)
app.register(getPromptByIdRoute)
app.register(createPromptRoute)
app.register(updatePromptRoute)
app.register(deletePromptRoute)
app.register(uploadVideosRoute)
app.register(createTranscriptionRoute)

app
  .listen({
    port: 3333,
  })
  .then((address) => {
    console.log(`Server is listening on ${address}`)
  })
  .catch((err) => {
    console.error("Error starting server:", err)
    process.exit(1)
  })
