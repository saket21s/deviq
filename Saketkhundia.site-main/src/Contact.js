  import React, { useRef } from "react";
  import emailjs from "emailjs-com";
  import "./App.css"; // using your same CSS

  export default function Contact() {
    const form = useRef();

    const sendEmail = (e) => {
      e.preventDefault();

      emailjs.sendForm(
        "YOUR_SERVICE_ID",   // replace with EmailJS service ID
        "YOUR_TEMPLATE_ID",  // replace with template ID
        form.current,
        "YOUR_PUBLIC_KEY"    // replace with your public key
      )
      .then((result) => {
          alert("Message Sent Successfully!");
      }, (error) => {
          alert("Failed to send message. Try again!");
      });

      e.target.reset();
    };

    return (
      <section id="contact" className="contact-section">
        <h2>Contact Me</h2>
        <form ref={form} onSubmit={sendEmail} className="contact-form">
          <input type="text" name="user_name" placeholder="Your Name" required />
          <input type="email" name="user_email" placeholder="Your Email" required />
          <textarea name="message" placeholder="Your Message" required></textarea>
          <button type="submit">Send Message</button>
        </form>
      </section>
    );
  }
