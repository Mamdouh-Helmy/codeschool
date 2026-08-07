"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "../ui/select";
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";
import { motion } from "framer-motion";
import type { PortfolioData } from "@/types/portfolio";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  service: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_STATE: FormState = {
  firstName: "", lastName: "", email: "", phoneNumber: "", service: "", message: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required";
  if (!form.lastName.trim()) errors.lastName = "Last name is required";
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = "Enter a valid email";
  if (!form.phoneNumber.trim()) errors.phoneNumber = "Phone number is required";
  const messageLength = form.message.trim().length;
  if (!messageLength) errors.message = "Message is required";
  else if (messageLength < 10) errors.message = "Message should be at least 10 characters";
  else if (messageLength > 2000) errors.message = "Message is too long (max 2000 characters)";
  return errors;
}

const Contact = ({ portfolio }: { portfolio: PortfolioData }) => {
  const contact = portfolio.contactInfo;
  const info = [
    ...(contact?.phone ? [{ icon: <FaPhoneAlt />, title: "Phone", description: contact.phone }] : []),
    ...(contact?.email ? [{ icon: <FaEnvelope />, title: "Email", description: contact.email }] : []),
    ...(contact?.location ? [{ icon: <FaMapMarkerAlt />, title: "Address", description: contact.location }] : []),
  ];

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverMessage, setServerMessage] = useState("");

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!portfolio?.id) {
      setStatus("error");
      setServerMessage("Portfolio not found. Please refresh the page.");
      return;
    }

    setStatus("submitting");
    setServerMessage("");

    try {
      const res = await fetch("/api/portfolio/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: portfolio.id,
          senderInfo: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            phoneNumber: form.phoneNumber.trim(),
          },
          service: form.service,
          message: form.message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          setServerMessage(data.errors.join(" • "));
        } else {
          setServerMessage(data.message || "Something went wrong. Please try again.");
        }
        setStatus("error");
        return;
      }

      setStatus("success");
      setServerMessage("Your message has been sent successfully!");
      setForm(INITIAL_STATE);
    } catch (err) {
      setStatus("error");
      setServerMessage("Network error. Please check your connection and try again.");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 2.4, duration: 0.4, ease: "easeIn" } }}
      className="py-6 text-secondary dark:text-white"
      dir="ltr"
    >
      <div className="container mx-auto" dir="ltr">
        <div className="flex flex-col xl:flex-row gap-[30px]">
          {/* form */}
          <div className="xl:w-[54%] order-2 xl:order-none">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-6 p-10 bg-gray-100 dark:bg-[#27272c] rounded-xl"
            >
              <h3 className="text-4xl text-accent">Let's work together</h3>
              <p className="text-secondary/60 dark:text-white/60">
                Have a project in mind or just want to say hello? Fill out the form below and I'll get back to you as soon as possible.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    type="text"
                    placeholder="Firstname"
                    value={form.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    aria-invalid={!!errors.firstName}
                  />
                  {errors.firstName && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <Input
                    type="text"
                    placeholder="Lastname"
                    value={form.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    aria-invalid={!!errors.lastName}
                  />
                  {errors.lastName && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Input
                    type="tel"
                    placeholder="Phone number"
                    value={form.phoneNumber}
                    onChange={(e) => handleChange("phoneNumber", e.target.value)}
                    aria-invalid={!!errors.phoneNumber}
                  />
                  {errors.phoneNumber && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.phoneNumber}</p>}
                </div>
              </div>

              <Select value={form.service} onValueChange={(v) => handleChange("service", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Select a service</SelectLabel>
                    <SelectItem value="web">Web Development</SelectItem>
                    <SelectItem value="uiux">UI/UX Design</SelectItem>
                    <SelectItem value="logo">Logo Design</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div>
                <Textarea
                  className="h-[200px]"
                  placeholder="Type your message here."
                  value={form.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  aria-invalid={!!errors.message}
                />
                {errors.message && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.message}</p>}
              </div>

              {status === "success" && (
                <p className="text-green-600 dark:text-green-400 text-sm">{serverMessage}</p>
              )}
              {status === "error" && (
                <p className="text-red-500 dark:text-red-400 text-sm">{serverMessage}</p>
              )}

              <Button type="submit" size="md" className="max-w-40" disabled={status === "submitting"}>
                {status === "submitting" ? "Sending..." : "Send message"}
              </Button>
            </form>
          </div>

          {/* info */}
          <div className="flex-1 flex items-center xl:justify-end order-1 xl:order-none mb-8 xl:mb-0">
            <ul className="flex flex-col gap-10">
              {info.map((item, index) => (
                <li key={index} className="flex items-center gap-6">
                  <div className="w-[52px] h-[52px] xl:w-[72px] xl:h-[72px] bg-gray-100 dark:bg-[#27272c] text-accent rounded-md flex items-center justify-center">
                    <div className="text-[28px]">{item.icon}</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-secondary/60 dark:text-white/60">{item.title}</p>
                    <h3 className="text-xl">{item.description}</h3>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default Contact;