"use client"; 
import React, { useEffect, useRef, useState } from "react"; 
import Image from "next/image"; 
import { usePathname } from "next/navigation"; 
import { Play, ExternalLink, Code, User, Calendar } from "lucide-react"; 
import { useI18n } from "@/i18n/I18nProvider"; 
import "@/app/globals.css"; 

const Projects = ({ showTitle = true }) => { 
  const pathname = usePathname(); 
  const { t } = useI18n(); 
  const [projects, setProjects] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true); 
  const [showPopup, setShowPopup] = useState(false); 
  const [selectedProject, setSelectedProject] = useState<any>(null); 
  const marqueeRef = useRef<HTMLDivElement>(null); 

  useEffect(() => { 
    const fetchProjects = async () => { 
      try { 
        const res = await fetch("/api/projects?featured=true&limit=10"); 
        const data = await res.json(); 
        if (data.success) { 
          const filtered = data.data.filter( 
            (p: any) => p.student?.role === "student" 
          ); 
          setProjects(filtered); 
        } else { 
          console.error("API Error:", data.message); 
        } 
      } catch (err) { 
        console.error("Failed to fetch projects:", err); 
      } finally { 
        setLoading(false); 
      } 
    }; 
    fetchProjects(); 
  }, []); 

  const formatDate = (dateString: string) => { 
    const date = new Date(dateString); 
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short", 
      day: "numeric", 
    }); 
  }; 

  const openProjectDetails = (project: any) => { 
    setSelectedProject(project); 
  }; 

  const closeProjectDetails = () => { 
    setSelectedProject(null); 
  }; 

  if (loading) 
    return ( 
      <div className="text-center py-20 text-gray-500 dark:text-gray-300"> 
        {t("common.loading")} 
      </div> 
    ); 

  const getImageInfo = (img?: string | null) => { 
    if (!img) return { src: null, useImgTag: false, isGif: false }; 
    const trimmed = String(img).trim(); 
    const isDataUri = /^data:image\/[a-zA-Z]+;base64,/.test(trimmed); 
    const isHttp = /^https?:\/\//i.test(trimmed); 
    const isLocal = /^\//.test(trimmed); 
    const isGifExtension = /\.gif(\?|#|$)/i.test(trimmed) || /\.gif$/i.test(trimmed); 
    const base64Regex = /^[A-Za-z0-9+/=\s]+$/; 
    const looksLikeBase64 = 
      !isDataUri && 
      !isHttp && 
      !isLocal && 
      trimmed.length > 100 && 
      base64Regex.test(trimmed.replace(/\s+/g, "")); 

    if (isDataUri) { 
      const isGif = /^data:image\/gif/i.test(trimmed); 
      return { src: trimmed, useImgTag: true, isGif: isGif }; 
    } 
    if (looksLikeBase64) { 
      const dataUri = `data:image/png;base64,${trimmed.replace(/\s+/g, "")}`; 
      return { src: dataUri, useImgTag: true, isGif: false }; 
    } 
    if (isHttp) { 
      const isGif = /\.gif(\?|#|$)/i.test(trimmed); 
      return { src: trimmed, useImgTag: true, isGif }; 
    } 
    if (isLocal) { 
      const isGif = /\.gif(\?|#|$)/i.test(trimmed); 
      return { src: trimmed, useImgTag: isGif, isGif }; 
    } 
    const assumed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`; 
    const isGif = /\.gif(\?|#|$)/i.test(assumed); 
    return { src: assumed, useImgTag: isGif, isGif }; 
  }; 

  const repeatedProjects = [...projects, ...projects]; 

  return ( 
    <section className={`dark:bg-darkmode relative overflow-hidden ${pathname === "/" ? "" : ""}`}> 
      {showTitle && ( 
        <h2 className="text-center mb-6">{t("projects.title")}</h2> 
      )} 

      <div className="relative w-full overflow-hidden py-8 marquee-container"> 
        <div ref={marqueeRef} className="flex gap-6 marquee-content"> 
          {repeatedProjects.map((project: any, index: number) => { 
            const { src, useImgTag } = getImageInfo(project?.image); 
            return ( 
              <div 
                key={`${project._id}-${index}`} 
                className={`flex-shrink-0 max-w-[300px] flex-shrink-0 group overflow-hidden cursor-pointer ${index % 2 === 1 ? "mt-28" : ""}`} 
                onClick={() => openProjectDetails(project)} 
              > 
                <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm border border-PowderBlueBorder dark:border-dark_border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30"> 
                  <div className="relative overflow-hidden bg-gray-100 dark:bg-dark_input"> 
                    <div className="w-full h-48 relative"> 
                      {src ? ( 
                        useImgTag ? ( 
                          <img 
                            src={src} 
                            alt={project.title} 
                            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105" 
                          /> 
                        ) : ( 
                          <Image 
                            src={src} 
                            alt={project.title} 
                            width={400} 
                            height={192} 
                            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105" 
                          /> 
                        ) 
                      ) : ( 
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-Aquamarine/10 flex items-center justify-center"> 
                          <Code className="w-12 h-12 text-primary/40" /> 
                        </div> 
                      )} 
                      {project.video && ( 
                        <div className="absolute top-3 right-3 bg-black/70 text-white rounded-full p-2"> 
                          <Play className="w-4 h-4" /> 
                        </div> 
                      )} 
                      {project.portfolioLink && ( 
                        <div className="absolute top-3 left-3 bg-black/70 text-white rounded-full p-2"> 
                          <ExternalLink className="w-4 h-4" /> 
                        </div> 
                      )} 
                    </div> 
                  </div> 
                  <div className="p-4"> 
                    <h3 className="font-bold text-MidnightNavyText dark:text-white text-lg mb-2 line-clamp-2"> 
                      {project.title} 
                    </h3> 
                    <p className="text-SlateBlueText dark:text-darktext text-sm mb-3 line-clamp-2"> 
                      {project.description} 
                    </p> 
                    {project.technologies && project.technologies.length > 0 && ( 
                      <div className="flex flex-wrap gap-1 mb-3"> 
                        {project.technologies.slice(0, 3).map((tech: string, idx: number) => ( 
                          <span 
                            key={idx} 
                            className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs" 
                          > 
                            {tech} 
                          </span> 
                        ))} 
                        {project.technologies.length > 3 && ( 
                          <span className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-SlateBlueText dark:text-darktext rounded text-xs"> 
                            +{project.technologies.length - 3} 
                          </span> 
                        )} 
                      </div> 
                    )} 
                  </div> 
                </div> 
              </div> 
            ); 
          })} 
        </div> 

        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-darkmode to-transparent z-10"></div> 
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-darkmode to-transparent z-10"></div> 
      </div> 

      <style jsx>{` 
        @keyframes marquee { 
          0% { transform: translateX(0); } 
          100% { transform: translateX(-50%); } 
        } 
        .marquee-content { 
          animation: marquee 40s linear infinite; 
          display: flex; 
          width: max-content; 
        } 
        .marquee-container:hover .marquee-content { 
          animation-play-state: paused; 
        } 
      `}</style> 

      <div className="mt-6 flex justify-center"> 
        <button 
          onClick={() => setShowPopup(true)} 
          className="btn_outline btn-2 group hover-outline-slide-down" 
        > 
          <span className="!flex !items-center gap-14"> 
            {t("projects.exploreMore")} 
          </span> 
        </button> 
      </div> 

      {showPopup && ( 
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"> 
          <div className="bg-white dark:bg-darkmode max-w-6xl w-full mx-auto p-6 rounded-xl relative shadow-lg animate-[fadeZoomIn_0.4s_ease-out_forwards] max-h-[90vh] overflow-hidden flex flex-col"> 
            <button 
              onClick={() => setShowPopup(false)} 
              className="absolute top-4 right-4 z-10 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all" 
              aria-label={t("common.close")} 
            > 
              ✕ 
            </button> 
            <h3 className="text-2xl font-bold text-center mb-6 text-MidnightNavyText dark:text-white"> 
              {t("projects.allProjects")} 
            </h3> 
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 flex-1"> 
              {projects.map((project: any) => { 
                const { src, useImgTag } = getImageInfo(project?.image); 
                return ( 
                  <div 
                    key={project._id} 
                    className="group overflow-hidden cursor-pointer" 
                    onClick={() => openProjectDetails(project)} 
                  > 
                    <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm border border-PowderBlueBorder dark:border-dark_border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 h-full"> 
                      <div className="relative overflow-hidden bg-gray-100 dark:bg-dark_input"> 
                        <div className="w-full h-40 relative"> 
                          {src ? ( 
                            useImgTag ? ( 
                              <img 
                                src={src} 
                                alt={project.title} 
                                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105" 
                              /> 
                            ) : ( 
                              <Image 
                                src={src} 
                                alt={project.title} 
                                width={400} 
                                height={160} 
                                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105" 
                              /> 
                            ) 
                          ) : ( 
                            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-Aquamarine/10 flex items-center justify-center"> 
                              <Code className="w-10 h-10 text-primary/40" /> 
                            </div> 
                          )} 
                          <div className="absolute top-2 right-2 flex gap-1"> 
                            {project.video && ( 
                              <div className="bg-black/70 text-white rounded-full p-1"> 
                                <Play className="w-3 h-3" /> 
                              </div> 
                            )} 
                            {project.portfolioLink && ( 
                              <div className="bg-black/70 text-white rounded-full p-1"> 
                                <ExternalLink className="w-3 h-3" /> 
                              </div> 
                            )} 
                          </div> 
                        </div> 
                      </div> 
                      <div className="p-4"> 
                        <h4 className="font-bold text-MidnightNavyText dark:text-white text-base mb-2 line-clamp-2"> 
                          {project.title} 
                        </h4> 
                        <p className="text-SlateBlueText dark:text-darktext text-sm mb-3 line-clamp-2"> 
                          {project.description} 
                        </p> 
                        {project.technologies && project.technologies.length > 0 && ( 
                          <div className="flex flex-wrap gap-1 mb-3"> 
                            {project.technologies.slice(0, 2).map((tech: string, idx: number) => ( 
                              <span 
                                key={idx} 
                                className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs" 
                              > 
                                {tech} 
                              </span> 
                            ))} 
                            {project.technologies.length > 2 && ( 
                              <span className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-SlateBlueText dark:text-darktext rounded text-xs"> 
                                +{project.technologies.length - 2} 
                              </span> 
                            )} 
                          </div> 
                        )} 
                      </div> 
                    </div> 
                  </div> 
                ); 
              })} 
            </div> 
          </div> 
        </div> 
      )} 

      {selectedProject && ( 
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"> 
          <div className="bg-white dark:bg-darkmode max-w-4xl w-full mx-auto rounded-xl relative shadow-lg animate-[fadeZoomIn_0.4s_ease-out_forwards] max-h-[90vh] overflow-hidden flex flex-col"> 
            <button 
              onClick={closeProjectDetails} 
              className="absolute top-4 right-4 z-10 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all" 
              aria-label={t("common.close")} 
            > 
              ✕ 
            </button> 
            <div className="relative h-64 bg-gray-100 dark:bg-dark_input"> 
              {(() => { 
                const { src, useImgTag } = getImageInfo(selectedProject.image); 
                if (!src) { 
                  return ( 
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-Aquamarine/10 flex items-center justify-center"> 
                      <Code className="w-16 h-16 text-primary/40" /> 
                    </div> 
                  ); 
                } 
                return useImgTag ? ( 
                  <img 
                    src={src} 
                    alt={selectedProject.title} 
                    className="w-full h-full object-cover" 
                  /> 
                ) : ( 
                  <Image 
                    src={src} 
                    alt={selectedProject.title} 
                    width={800} 
                    height={256} 
                    className="w-full h-full object-cover" 
                  /> 
                ); 
              })()} 
            </div> 

            <div className="p-6 overflow-y-auto flex-1"> 
              <h3 className="text-2xl font-bold text-MidnightNavyText dark:text-white mb-4"> 
                {selectedProject.title} 
              </h3> 
              <p className="text-SlateBlueText dark:text-darktext mb-6 leading-relaxed"> 
                {selectedProject.description} 
              </p> 
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"> 
                <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 flex flex-col h-full"> 
                  <h4 className="font-semibold text-MidnightNavyText dark:text-white mb-2"> 
                    {t("projects.technologiesUsed")} 
                  </h4> 
                  <div className="flex flex-wrap gap-2 mt-auto"> 
                    {selectedProject.technologies?.map((tech: string, idx: number) => ( 
                      <span 
                        key={idx} 
                        className="bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-lg text-sm font-medium" 
                      > 
                        {tech} 
                      </span> 
                    ))} 
                  </div> 
                </div> 
                <div className="space-y-4 flex flex-col h-full"> 
                  <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 flex-1"> 
                    <span className="mb-2 block">{t("projects.student")}</span> 
                    <div className="flex items-center gap-3 mb-3"> 
                      <User className="w-5 h-5 text-primary" /> 
                      <div> 
                        <p className="text-MidnightNavyText dark:text-white font-medium"> 
                          {selectedProject.student?.name} 
                        </p> 
                      </div> 
                    </div> 
                  </div> 
                </div> 
              </div> 
              <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border"> 
                {selectedProject.video && ( 
                  <a 
                    href={selectedProject.video} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2" 
                  > 
                    <Play className="w-4 h-4" /> 
                    {t("projects.watchDemo")} 
                  </a> 
                )} 
                {selectedProject.portfolioLink && ( 
                  <a 
                    href={selectedProject.portfolioLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2" 
                  > 
                    <ExternalLink className="w-4 h-4" /> 
                    {t("projects.viewPortfolio")} 
                  </a> 
                )} 
              </div> 
            </div> 
          </div> 
        </div> 
      )} 
    </section> 
  ); 
}; 

export default Projects;
