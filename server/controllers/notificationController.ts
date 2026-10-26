import type { Request, Response } from "express";
import { prisma } from "../config/db";
import { idParam } from "../lib/http";

export async function list(req: Request, res: Response) {
  const userId = req.user!.id;
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, channel: "IN_APP" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({ where: { userId, channel: "IN_APP", readAt: null } }),
  ]);
  // Which other channels each event also went out on (all simulated for now).
  const related = await prisma.notification.findMany({
    where: { userId, channel: { not: "IN_APP" }, createdAt: { gte: notifications.at(-1)?.createdAt ?? new Date(0) } },
    select: { event: true, relatedId: true, channel: true, status: true },
  });
  res.json({
    unread,
    notifications: notifications.map((n) => ({
      id: n.id,
      event: n.event,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.readAt,
      createdAt: n.createdAt,
      alsoSent: related
        .filter((r) => r.event === n.event && r.relatedId === n.relatedId)
        .map((r) => ({ channel: r.channel, status: r.status })),
    })),
  });
}

export async function unreadCount(req: Request, res: Response) {
  const unread = await prisma.notification.count({ where: { userId: req.user!.id, channel: "IN_APP", readAt: null } });
  res.json({ unread });
}

export async function markRead(req: Request, res: Response) {
  await prisma.notification.updateMany({
    where: { id: idParam(req), userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
}

export async function markAllRead(req: Request, res: Response) {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
}
