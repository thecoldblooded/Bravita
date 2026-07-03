"use client"

import React, { useEffect, useState } from "react"
import { m } from "framer-motion"
import { cn } from "@/lib/utils"

import { LucideIcon } from "lucide-react"

interface NavItem {
    name: string
    id?: string
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
    const initialActiveTab = externalActiveTab ?? items[0]?.name ?? ""
    const [activeTab, setActiveTab] = useState(initialActiveTab)
    const [isMobile, setIsMobile] = useState(false)

    // Sync from prop if changed (using render-time sync)
    const [prevExternalActiveTab, setPrevExternalActiveTab] = useState(externalActiveTab);
    if (externalActiveTab !== prevExternalActiveTab) {
        setPrevExternalActiveTab(externalActiveTab);
        if (externalActiveTab) {
            setActiveTab(externalActiveTab);
        }
    }

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }

        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const resolveTargetElement = (item: NavItem): Element | null => {
        if (item.id) {
            // Prefer the real section, fall back to the lazy wrapper (id="xxx-wrapper")
            const el = document.getElementById(item.id)
            if (el) return el

            const wrapper = document.getElementById(`${item.id}-wrapper`)
            if (wrapper) return wrapper
        }

        if (item.url?.startsWith("#")) {
            const el = document.querySelector(item.url)
            if (el) return el
        }

        return null
    }

    const HEADER_OFFSET = 160 // header height + breathing room so badge+heading are fully visible
    const getOffset = (item: NavItem) => (item.id === "about" ? 80 : HEADER_OFFSET)

    // Single deterministic jump. No competing smooth scrolls.
    const jumpTo = (target: Element, offset: number, behavior: ScrollBehavior = "smooth") => {
        const top = target.getBoundingClientRect().top + window.scrollY - offset
        // Clamp so we never scroll into negative territory
        window.scrollTo({ top: Math.max(0, top), behavior })
    }

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
        e.preventDefault()
        setActiveTab(item.name)

        if (item.onClick) {
            item.onClick()
            return
        }

        const offset = getOffset(item)

        // Is the real section already mounted? (non-wrapper id match)
        const realSection = item.id ? document.getElementById(item.id) : null
        const wrapper = item.id ? document.getElementById(`${item.id}-wrapper`) : null
        const isActiveSectionLoaded = realSection !== null && wrapper !== realSection

        if (isActiveSectionLoaded) {
            // Stable single scroll — final destination reached in one move.
            jumpTo(realSection!, offset)
            return
        }

        // Lazy section not yet loaded: scroll toward the wrapper so its IntersectionObserver fires.
        // Then perform ONE final precise scroll once the content mounts.
        if (wrapper) {
            jumpTo(wrapper, offset)

            if (item.id) {
                let attempts = 0
                const poll = setInterval(() => {
                    attempts++
                    const el = document.getElementById(item.id)
                    // Once the real section mounts (and is distinct from the wrapper), settle.
                    if (el && el !== wrapper) {
                        // Use 'auto' (instant) for the final correction to avoid competing animations.
                        jumpTo(el, offset, "auto")
                        clearInterval(poll)
                        return
                    }
                    if (attempts >= 20) clearInterval(poll) // ~2s safety cap
                }, 100)
            }
            return
        }

        // Fallback: url hash selector
        const fallback = resolveTargetElement(item)
        if (fallback) jumpTo(fallback, offset)
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
                                <m.div
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
                                </m.div>
                            )}
                        </a>
                    )
                })}
            </div>
        </div>
    )
}
