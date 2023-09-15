import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function getAllPromptsRoute(app: FastifyInstance) {
  app.get("/prompts", async () => {
    const prompts = await prisma.prompt.findMany()
    return prompts
  })
}

export async function getPromptByIdRoute(app: FastifyInstance) {
  app.get("/prompts/:id", async (request) => {
    const { id } = request.params as { id: string };
    const prompt = await prisma.prompt.findUnique({
      where: { id: id },
    });
    return prompt;
  })
}

export async function createPromptRoute(app: FastifyInstance) {
  app.post("/prompts", async (request) => {
    const { title, template } = request.body as {
      title: string
      template: string
    }
    const prompt = await prisma.prompt.create({
      data: {
        title: title,
        template: template,
      },
    })
    return prompt;
  })
}

export async function updatePromptRoute(app: FastifyInstance) {
  app.put("/prompts/:id", async (request) => {
    const { id } = request.params as { id: string };
    const { title, template } = request.body as {
      title: string
      template: string
    }
    const prompt = await prisma.prompt.update({
      where: { id: id },
      data: {
        title: title,
        template: template,
      },
    })
    return prompt;
  })
}

export async function deletePromptRoute(app: FastifyInstance) {
  app.delete("/prompts/:id", async (request) => {
    const { id } = request.params as { id: string };
    const prompt = await prisma.prompt.delete({
      where: { id: id },
    })
    return prompt;
  })
}