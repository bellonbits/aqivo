import { AlignLeft, Calendar, CalendarPlus, Clock, Code, Columns2, FileText, HelpCircle, Image, Images, Info, LayoutGrid, LayoutPanelTop, List, type LucideIcon, Mail, Map, MapPin, Megaphone, MessageCircle, Minus, MousePointerClick, MoveHorizontal, MoveVertical, Percent, Phone, Play, Quote, Share2, Sparkles, Star, Tag, Type, User, Users, Zap } from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  layout: LayoutPanelTop, megaphone: Megaphone, user: User, image: Image, columns: Columns2, type: Type, 'file-text': FileText, info: Info, grid: LayoutGrid, 'move-horizontal': MoveHorizontal,
  tag: Tag, 'layout-grid': LayoutGrid, list: List, percent: Percent, star: Star, quote: Quote, 'help-circle': HelpCircle, images: Images, play: Play, users: Users, calendar: Calendar,
  'calendar-plus': CalendarPlus, 'message-circle': MessageCircle, phone: Phone, mail: Mail, clock: Clock, 'map-pin': MapPin, map: Map, 'share-2': Share2, 'mouse-pointer': MousePointerClick,
  'move-vertical': MoveVertical, minus: Minus, code: Code, sparkles: Sparkles, zap: Zap,
}
export const sectionIcon = (name: string): LucideIcon => ICONS[name] ?? AlignLeft
