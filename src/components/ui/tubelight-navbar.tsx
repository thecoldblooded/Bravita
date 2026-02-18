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
    const [activeTab, setActiveTab] = useState(externalActiveTab || items[0].name)
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
        // Prefer item.id (matches LazySection wrapper), then fall back to url hash
        if (item.id) {
            const el = document.getElementById(item.id)
            if (el) return el
        }

        if (item.url?.startsWith("#")) {
            const el = document.querySelector(item.url)
            if (el) return el
        }

        return null
    }

    const HEADER_OFFSET = 160 // header height + breathing room so badge+heading are fully visible

    const getOffset = (item: NavItem) => item.id === "about" ? 80 : HEADER_OFFSET

    const scrollToSectionHeading = (container: Element, offset: number, behavior: ScrollBehavior = "smooth"): boolean => {
        // Find the badge span (uppercase label above h2), fall back to h2
        const badge = container.querySelector<HTMLElement>('[class*="tracking-wider"], [class*="uppercase"]')
        const heading = container.querySelector<HTMLElement>('h2')
        const target = badge ?? heading
        if (target) {
            const targetTop = target.getBoundingClientRect().top + window.scrollY
            window.scrollTo({ top: targetTop - offset, behavior })
            return true
        }
        return false
    }

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
        e.preventDefault()
        setActiveTab(item.name)

        if (item.onClick) {
            item.onClick()
            return
        }

        const element = resolveTargetElement(item)
        if (!element) return

        const offset = getOffset(item)

        // For "about", use stable offsetTop (avoids scroll-animated layout shifts)
        if (item.id === "about") {
            const el = element as HTMLElement
            let absoluteTop = el.offsetTop
            let parent = el.offsetParent as HTMLElement | null
            while (parent) {
                absoluteTop += parent.offsetTop
                parent = parent.offsetParent as HTMLElement | null
            }
            window.scrollTo({ top: absoluteTop - offset, behavior: "smooth" })
            return
        }

        // Try scrolling to heading immediately
        if (scrollToSectionHeading(element, offset)) return

        // Content not loaded yet (lazy section) — scroll near wrapper to trigger IntersectionObserver
        const elementTop = element.getBoundingClientRect().top + window.scrollY
        window.scrollTo({ top: elementTop - offset, behavior: "smooth" })

        // Watch for lazy content to appear, then re-scroll precisely
        const observer = new MutationObserver(() => {
            if (scrollToSectionHeading(element, offset)) {
                observer.disconnect()
            }
        })
        observer.observe(element, { childList: true, subtree: true })

        // Safety cleanup
        setTimeout(() => observer.disconnect(), 4000)
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
