export function credentialTemplate(p: {
  candidateName: string, role: string, campaignName: string,
  email: string, tempPassword: string, loginUrl: string,
  appDownloadUrl?: string
}): string {
  const downloadSection = p.appDownloadUrl ? `
  <div style="background:#fff8f0;border:2px solid #FB851E;border-radius:10px;padding:20px;margin:20px 0;text-align:center">
    <p style="font-weight:700;font-size:15px;margin:0 0 6px;color:#1E2A3A">📥 Download the Assessment App</p>
    <p style="color:#555;font-size:13px;margin:0 0 14px">For a secure, proctored environment please use our desktop app instead of a browser tab.</p>
    <a href="${p.appDownloadUrl}"
       style="display:inline-block;background:#FB851E;color:#fff;padding:11px 26px;
              border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">
      ⬇ Download IndiumAssessment.zip
    </a>
    <p style="color:#999;font-size:11px;margin:10px 0 0">
      Unzip the file → Run <strong>Indium Assessment.exe</strong> → Log in with the credentials below.
    </p>
  </div>` : ''

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#FB851E,#FB371E);padding:24px;border-radius:12px;margin-bottom:24px">
    <h1 style="color:#fff;margin:0;font-size:22px">Indium Assessment Invitation</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">${p.campaignName} — ${p.role}</p>
  </div>
  <p>Hi ${p.candidateName},</p>
  <p>You have been invited to complete the technical assessment for <strong>${p.role}</strong>.</p>
  ${downloadSection}
  <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">
    <p style="margin:4px 0"><strong>Login URL:</strong> <a href="${p.loginUrl}">${p.loginUrl}</a></p>
    <p style="margin:4px 0"><strong>Email:</strong> ${p.email}</p>
    <p style="margin:4px 0"><strong>Temporary Password:</strong> <code style="background:#e0e0e0;padding:2px 6px;border-radius:4px">${p.tempPassword}</code></p>
  </div>
  <p>You will be asked to change your password on first login. Please complete the assessment in one sitting — your session will be proctored via camera and microphone.</p>
  <p style="color:#888;font-size:12px">Indium AI — automated message, do not reply.</p>
</body></html>`
}
