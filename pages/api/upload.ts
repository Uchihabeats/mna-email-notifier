import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { google } from "googleapis";
// @ts-ignore
const formidable = require("formidable");
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Service account fallback (no redirect URI needed)
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET
);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err: any, fields: any, files: any) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);
    // Fix: formidable returns field values as string[] sometimes, so get first value if array
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
    const fileObj = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!fileObj || !email) {
      return res.status(400).json({ error: "Missing file or email" });
    }

    // Accept accessToken from the frontend (after user signs in)
    const accessToken = Array.isArray(fields.accessToken) ? fields.accessToken[0] : fields.accessToken;

    // Use user's access token if provided, otherwise fallback to service account
    let driveAuth;
    if (accessToken) {
      driveAuth = new google.auth.OAuth2();
      driveAuth.setCredentials({ access_token: accessToken });
    } else {
      driveAuth = oauth2Client;
    }

    // Upload file to Google Drive
    const drive = google.drive({ version: "v3", auth: driveAuth });
    const fileStream = fs.createReadStream(fileObj.filepath);
    await drive.files.create({
      requestBody: {
        name: fileObj.originalFilename || "uploaded-file",
        mimeType: fileObj.mimetype || "application/octet-stream",
      },
      media: {
        mimeType: fileObj.mimetype || "application/octet-stream",
        body: fileStream,
      },
    });

    // Send email notification
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: EMAIL_USER,
      to: email,
      subject: "File Uploaded to Google Drive",
      text: `The file "${fileObj.originalFilename}" has been uploaded to Google Drive.`,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
