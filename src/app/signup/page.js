import { redirect } from 'next/navigation';

// Self-serve signup is disabled. Clients are onboarded via admin panel.
// Redirect anyone who lands here to the contact form.
export default function SignupRedirect() {
  redirect('/#contact');
}
