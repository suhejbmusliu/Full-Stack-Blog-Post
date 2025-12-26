import express from "express"
import nodemailer from "nodemailer"

const router = express.Router()

router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body || {}

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: "Missing fields" })
    }

    // If you don't want email sending yet, we can just save/log it.
    // But since you already have nodemailer installed, here is a working base:
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    })

    await transporter.sendMail({
      from: `"Shoqata Dituria Website" <${process.env.MAIL_USER}>`,
      to: process.env.CONTACT_TO || process.env.MAIL_USER,
      subject: `New Contact Message from ${name}`,
      replyTo: email,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    })

    return res.json({ ok: true })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ ok: false, error: "Failed to send message" })
  }
})

export default router
