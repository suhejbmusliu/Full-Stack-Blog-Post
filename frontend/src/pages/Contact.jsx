import { useState } from "react";
import "./Contact.css";

const W3F_KEY = import.meta.env.VITE_WEB3FORMS_KEY;

export default function Contact() {
  const [form, setForm] = useState({
    firstName: "",
    surname: "",
    email: "",
    description: "",
    website: "", // honeypot
  });

  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("");

    // Honeypot check (bots fill this)
    if (form.website) return;

    try {
      setSending(true);

      const formData = new FormData();
      formData.append("access_key", W3F_KEY);

      formData.append(
        "subject",
        "New Contact Form — Shoqata Dituria"
      );

      formData.append(
        "from_name",
        `${form.firstName} ${form.surname}`
      );

      formData.append("email", form.email);

      formData.append(
        "message",
        `First Name: ${form.firstName}
Surname: ${form.surname}
Email: ${form.email}

Project Description:
${form.description}`
      );

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setStatus("Something went wrong. Please try again.");
        return;
      }

      setStatus("Message sent successfully!");
      setForm({
        firstName: "",
        surname: "",
        email: "",
        description: "",
        website: "",
      });
    } catch {
      setStatus("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="contactPage">
      <div className="container">
        <h1 className="contactTitle">CONTACT US</h1>

        <div className="contactGrid">
          {/* LEFT: FORM */}
          <form className="contactForm" onSubmit={onSubmit}>
            <div className="contactRow">
              <label className="field">
                <span className="field__label">First Name</span>
                <input
                  className="field__input"
                  name="firstName"
                  value={form.firstName}
                  onChange={onChange}
                  required
                />
              </label>

              <label className="field">
                <span className="field__label">Surname</span>
                <input
                  className="field__input"
                  name="surname"
                  value={form.surname}
                  onChange={onChange}
                  required
                />
              </label>
            </div>

            <label className="field field--full">
              <span className="field__label">Email</span>
              <input
                className="field__input"
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                required
              />
            </label>

            <label className="field field--full">
              <span className="field__label">Project Description</span>
              <textarea
                className="field__textarea"
                name="description"
                value={form.description}
                onChange={onChange}
                rows={4}
                required
              />
            </label>

            {/* Honeypot (hidden) */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={onChange}
              className="hpField"
              tabIndex="-1"
              autoComplete="off"
            />

            <div className="contactActions">
              <button className="contactSendBtn" disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </button>

              {status && <span className="contactStatus">{status}</span>}
            </div>
          </form>

          {/* RIGHT TEXT */}
          <div className="contactText">
            <p>
              Shoqata Kulturore-Arsimore Dituria është gjithmonë e hapur për ide
              të reja, iniciativa kreative dhe projekte bashkëpunuese që
              kontribuojnë në zhvillimin e arsimit, kulturës dhe dijes në
              komunitetin tonë.
            </p>

            <p>
              Na shkruani dhe le ta ndërtojmë së bashku një të ardhme më të pasur
              me dije, kulturë dhe bashkëpunim.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
