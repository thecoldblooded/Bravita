"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

import { LucideIcon } from "lucide-react"

interface NavItem {
    name: string
    url: string
    icon: LucideIcon
    onClick?: () => void
}

interface NavBarProps {
    items: NavItem[]
    className?: string
    activeTab?: string
    layoutId?: string
}

export function NavBar({ items, className, activeTab: externalActiveTab, layoutId = "nav-lamp" }: NavBarProps) {
    const [activeTab, setActiveTab] = useState(externalActiveTab || items[0].name)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        if (externalActiveTab) {
            setActiveTab(externalActiveTab)
        }
    }, [externalActiveTab])

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }

        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
        e.preventDefault()
        setActiveTab(item.name)

        if (item.onClick) {
            item.onClick()
        } else {
            const element = document.querySelector(item.url)
            if (element) {
                element.scrollIntoView({ behavior: "smooth" })
            }
        }
    }

    return (
        <div
            className={cn(
                "z-50 w-fit",
                className,
            )}
        >
            <div className="flex items-center gap-1 bg-white/80 border border-white/20 backdrop-blur-lg py-1.5 px-1.5 rounded-full shadow-lg transition-all duration-300">
                {items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.name

                    return (
                        <a
                            key={item.name}
                            href={item.url}
                            onClick={(e) => handleClick(e, item)}
                            className={cn(
                                "relative cursor-pointer text-xs md:text-sm font-bold px-4 md:px-6 py-2 rounded-full transition-all duration-300 z-10",
                                "text-gray-600 hover:text-orange-600",
                                isActive && "text-orange-600",
                            )}
                        >
                            <span className="hidden md:inline relative z-10">{item.name}</span>
                            <span className="md:hidden relative z-10">
                                <Icon size={18} strokeWidth={2.5} />
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId={layoutId}
                                    className="absolute inset-0 w-full bg-orange-100/80 rounded-full z-0"
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30,
                                    }}
                                >
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-orange-500 rounded-t-full">
                                        <div className="absolute w-12 h-6 bg-orange-500/30 rounded-full blur-md -top-2 -left-2" />
                                        <div className="absolute w-8 h-6 bg-orange-500/30 rounded-full blur-sm -top-1" />
                                    </div>
                                </motion.div>
                            )}
                        </a>
                    )
                })}
            </div>
        </div>
    )
}
