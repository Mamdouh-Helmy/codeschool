"use client";
import { useState, useEffect } from "react";
import {
  FileText,
  Image,
  Video,
  Link,
  User,
  X,
  Save,
  Rocket,
  Upload,
  Film,
  Globe,
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react";

interface Props {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function ProjectForm({ initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    description: initial?.description || "",
    image: initial?.image || "",
    video: initial?.video || "",
    portfolioLink: initial?.portfolioLink || "",
    student: initial?.student || "",
    technologies: initial?.technologies || [],
    featured: initial?.featured || false,
    isActive: initial?.isActive ?? true,
  }));

  const [technologies, setTechnologies] = useState<string[]>(
    initial?.technologies || []
  );
  const [newTechInput, setNewTechInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // ✅ جلب قائمة الطلاب من API
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setStudentsLoading(true);
        const res = await fetch("/api/students", { cache: "no-store" });
        const json = await res.json();
        
        if (json.success) {
          setStudents(json.data);
          
          // ✅ إذا كان هناك طالب محدد مسبقاً، نحدده في الـ dropdown
          if (initial?.student?.id) {
            const existingStudent = json.data.find(
              (student: Student) => student._id === initial.student.id
            );
            if (existingStudent) {
              setSelectedStudent(existingStudent);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, [initial]);

  // ✅ معاينة الصورة
  useEffect(() => {
    if (form.image) {
      setImagePreview(form.image);
    }
  }, [form.image]);

  const onChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ عند اختيار طالب من الـ dropdown
  const handleStudentSelect = (student: Student | null) => {
    setSelectedStudent(student);
    
    if (student) {
      setForm((prev) => ({
        ...prev,
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        student: "",
      }));
    }
  };

  // ✅ إضافة تكنولوجيا جديدة
  const addTechnology = () => {
    const tech = newTechInput.trim();
    if (tech && !technologies.includes(tech)) {
      const updatedTechs = [...technologies, tech];
      setTechnologies(updatedTechs);
      setNewTechInput("");
      onChange("technologies", updatedTechs);
    }
  };

  // ✅ حذف تكنولوجيا
  const removeTechnology = (index: number) => {
    const updatedTechs = technologies.filter((_, i) => i !== index);
    setTechnologies(updatedTechs);
    onChange("technologies", updatedTechs);
  };

  // ✅ إدخال بالزر Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTechnology();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // هنا يمكنك رفع الصورة إلى السيرفر
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        onChange("image", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ التحقق من اختيار طالب
      if (!selectedStudent) {
        alert("Please select a student");
        setLoading(false);
        return;
      }

      const payload = {
        ...form,
        technologies: technologies,
        student: selectedStudent ? {
          id: selectedStudent._id,
          name: selectedStudent.name,
          email: selectedStudent.email,
          role: selectedStudent.role,
        } : {
          id: "student_id_here",
          name: "Student Name",
          email: "student@example.com",
          role: "student",
        },
      };

      const method = initial?._id ? "PUT" : "POST";
      const url = initial?._id ? `/api/projects/${initial._id}` : "/api/projects";

      console.log("Sending payload:", payload);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const errorData = await res.json();
        console.error("Failed to save project:", errorData);
        alert(`Failed to save project: ${errorData.message}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("An error occurred while saving the project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Project Information
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Basic details about the student project
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <FileText className="w-3 h-3 text-primary" />
              Project Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="e.g., E-commerce Website"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <User className="w-3 h-3 text-primary" />
              Select Student *
            </label>
            <div className="relative">
              <select
                value={selectedStudent?._id || ""}
                onChange={(e) => {
                  const studentId = e.target.value;
                  const student = students.find(s => s._id === studentId) || null;
                  handleStudentSelect(student);
                }}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 appearance-none pr-10"
                required
                disabled={studentsLoading}
              >
                <option value="">Choose a student...</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
              </div>
            </div>
            {studentsLoading && (
              <p className="text-11 text-SlateBlueText dark:text-darktext">
                Loading students...
              </p>
            )}
            {selectedStudent && (
              <div className="mt-2 p-2 bg-IcyBreeze dark:bg-dark_input rounded-lg">
                <p className="text-12 text-MidnightNavyText dark:text-white">
                  <strong>Selected:</strong> {selectedStudent.name}
                </p>
                <p className="text-11 text-SlateBlueText dark:text-darktext">
                  {selectedStudent.email}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileText className="w-3 h-3 text-primary" />
            Description *
          </label>
          <textarea
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            rows={3}
            placeholder="Describe the project, technologies used, and achievements..."
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
            required
          />
        </div>
      </div>

      {/* Technologies */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-ElectricAqua" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Technologies
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Add technologies used in this project
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Input لإضافة تكنولوجيا جديدة */}
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={newTechInput}
                onChange={(e) => setNewTechInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a technology (e.g., React, Node.js)"
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
            </div>
            <button
              type="button"
              onClick={addTechnology}
              disabled={!newTechInput.trim()}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* قائمة التكنولوجيات المضافوة */}
          {technologies.length > 0 && (
            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                Added Technologies:
              </label>
              <div className="flex flex-wrap gap-2">
                {technologies.map((tech, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white px-3 py-2 rounded-lg text-13"
                  >
                    <span>{tech}</span>
                    <button
                      type="button"
                      onClick={() => removeTechnology(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-11 text-SlateBlueText dark:text-darktext">
            Press Enter or click Add to include multiple technologies
          </p>
        </div>
      </div>

      {/* Media & Links */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
            <Image className="w-4 h-4 text-Aquamarine" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Media & Links
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Upload images, videos, and portfolio links
            </p>
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-Aquamarine" />
            Project Image
          </label>
          
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="text"
                value={form.image}
                onChange={(e) => onChange("image", e.target.value)}
                placeholder="Image URL or upload file"
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            
            {imagePreview && (
              <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Film className="w-3 h-3 text-Aquamarine" />
              Video URL
            </label>
            <input
              type="url"
              value={form.video}
              onChange={(e) => onChange("video", e.target.value)}
              placeholder="https://youtube.com/..."
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Link className="w-3 h-3 text-Aquamarine" />
              Portfolio Link
            </label>
            <input
              type="url"
              value={form.portfolioLink}
              onChange={(e) => onChange("portfolioLink", e.target.value)}
              placeholder="https://portfolio.com..."
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Save className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Settings
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Project visibility and status
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Rocket className="w-3 h-3 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => onChange("featured", e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary border-PowderBlueBorder rounded"
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  Featured Project
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                Highlight this project as featured in the YoungStars section
              </p>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
            <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center group-hover:bg-Aquamarine/20 transition-colors">
              <Save className="w-3 h-3 text-Aquamarine" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => onChange("isActive", e.target.checked)}
                  className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded"
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  Active Project
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                Make this project visible to users in the YoungStars section
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !selectedStudent}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : initial ? (
            <>
              <Save className="w-3 h-3" />
              Update Project
            </>
          ) : (
            <>
              <Rocket className="w-3 h-3" />
              Create Project
            </>
          )}
        </button>
      </div>
    </form>
  );
}