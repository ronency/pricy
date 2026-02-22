import Mailgun from 'mailgun.js';
import FormData from 'form-data';

let mgClient = null;

export function getMailgunClient() {
  if (mgClient) return mgClient;

  const apiKey = process.env.MAILGUN_API_KEY;
  if (!apiKey) return null;

  const mailgun = new Mailgun(FormData);
  mgClient = mailgun.client({
    username: 'api',
    key: apiKey,
  });

  return mgClient;
}

export function getMailgunDomain() {
  return process.env.MAILGUN_DOMAIN || '';
}

export function getFromEmail() {
  return process.env.FROM_EMAIL || 'Pricy <noreply@pricy.app>';
}
