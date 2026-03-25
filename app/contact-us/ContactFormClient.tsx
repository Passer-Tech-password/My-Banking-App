\"use client\";

import { useState } from \"react\";
import { useToast } from \"@/components/ToastProvider\";
import { auth } from \"@/lib/firebase\";

export default function ContactFormClient() {
  const toast = useToast();
  const [firstName, setFirstName] = useState(\"\");
  const [lastName, setLastName] = useState(\"\");
  const [email, setEmail] = useState(\"\");
  const [subject, setSubject] = useState(\"\");
  const [message, setMessage] = useState(\"\");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const user = auth.currentUser;
    if (!user) {
      toast.error(\"Please sign in to send a message.\");
      return;
    }
    const name = `${firstName} ${lastName}`.trim();
    const emailTrimmed = email.trim().toLowerCase();
    const messageTrimmed = message.trim();
    if (!name || !emailTrimmed || !messageTrimmed) {
      toast.error(\"Please fill in name, email, and message.\");
      return;
    }
    try {
      setLoading(true);
      const idToken = await user.getIdToken();
      const res = await fetch(\"/api/contact\", {
        method: \"POST\",
        headers: {
          \"Content-Type\": \"application/json\",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name, email: emailTrimmed, subject: subject.trim(), message: messageTrimmed }),
      });
      const raw = await res.text();
      const data = (() => {
        try {
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      if (!res.ok) {
        toast.error(String((data && (data.message || data.code)) || raw || \"Failed to send message\"));
        return;
      }
      toast.success(\"Message sent successfully\");
      setFirstName(\"\");
      setLastName(\"\");
      setEmail(\"\");
      setSubject(\"\");
      setMessage(\"\");
    } catch (e) {
      console.error(\"CONTACT SUBMIT ERROR:\", e);
      toast.error(\"Failed to send message. Please try again.\");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className=\"space-y-6\" onSubmit={handleSubmit}>
      <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
        <div>
          <label htmlFor=\"firstName\" className=\"block text-sm font-medium text-gray-700 mb-2\">First Name</label>
          <input
            type=\"text\"
            id=\"firstName\"
            className=\"w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all\"
            placeholder=\"John\"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor=\"lastName\" className=\"block text-sm font-medium text-gray-700 mb-2\">Last Name</label>
          <input
            type=\"text\"
            id=\"lastName\"
            className=\"w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all\"
            placeholder=\"Doe\"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor=\"email\" className=\"block text-sm font-medium text-gray-700 mb-2\">Email</label>
        <input
          type=\"email\"
          id=\"email\"
          className=\"w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all\"
          placeholder=\"john@example.com\"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor=\"subject\" className=\"block text-sm font-medium text-gray-700 mb-2\">Subject</label>
        <input
          type=\"text\"
          id=\"subject\"
          className=\"w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all\"
          placeholder=\"How can we help?\"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor=\"message\" className=\"block text-sm font-medium text-gray-700 mb-2\">Message</label>
        <textarea
          id=\"message\"
          rows={4}
          className=\"w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none\"
          placeholder=\"Your message...\"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        ></textarea>
      </div>

      <button
        type=\"submit\"
        disabled={loading}
        className=\"w-full bg-blue-600 text-white font-semibold py-4 rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-60\"
      >
        {loading ? \"Sending...\" : \"Send Message\"}
      </button>
    </form>
  );
}
