'use client'

import { X, ShieldAlert, ShieldCheck, Users, Eye, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export interface RegionUser {
    id: string
    name: string
    role: 'admin' | 'rider' | 'merchant' | 'customer'
    status: 'active' | 'pending_approval' | 'blocked'
    documents?: { type: string; url: string; approved: boolean | null }[]
}

interface ManagementHubDrawerProps {
    regionCode: string | null
    regionName?: string
    hasIssue?: boolean
    users: RegionUser[]
    onClose: () => void
    onResolveIssue: (code: string) => void
    onUserAction: (regionCode: string, userId: string, action: 'block' | 'delete' | 'approve_doc' | 'decline_doc') => void
}

export function ManagementHubDrawer({
    regionCode,
    regionName,
    hasIssue,
    users,
    onClose,
    onResolveIssue,
    onUserAction
}: ManagementHubDrawerProps) {
    if (!regionCode) return null

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-background border-l border-border h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right-full transition-transform duration-300">

                {/* Drawer Header */}
                <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-bold uppercase tracking-wider text-primary">
                            {regionName} Hub
                        </h2>
                        <p className="text-sm text-muted-foreground">Admin & User Control Center</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                <div className="p-6 space-y-8 flex-1">

                    {/* Alert resolution for affected regions */}
                    {hasIssue && (
                        <Card className="p-4 bg-destructive/10 border-destructive/50 flex justify-between items-center text-destructive">
                            <div className="flex gap-3">
                                <ShieldAlert className="h-6 w-6" />
                                <div>
                                    <h4 className="font-bold">Critical Issue Detected</h4>
                                    <p className="text-sm">High rates of declined orders in the last hour.</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => onResolveIssue(regionCode)}>
                                Resolve Issue
                            </Button>
                        </Card>
                    )}

                    {/* Regional Admins */}
                    <div>
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" /> Assigned Admins
                        </h3>
                        <div className="space-y-3">
                            {users.filter(u => u.role === 'admin').map(admin => (
                                <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                                    <div>
                                        <p className="font-semibold text-foreground">{admin.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{admin.id}</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => onUserAction(regionCode, admin.id, 'delete')}>
                                        Remove Admin
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full border-dashed">Assign New Admin to Region</Button>
                        </div>
                    </div>

                    {/* Rider / User Approvals */}
                    <div>
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" /> Pending Approvals & Users
                        </h3>
                        <div className="space-y-3">
                            {users.filter(u => u.role !== 'admin').map(user => (
                                <Card key={user.id} className="p-4 border border-border bg-card">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-semibold flex items-center gap-2 text-foreground">
                                                {user.name}
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted uppercase font-bold text-muted-foreground">{user.role}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${user.status === 'pending_approval' ? 'bg-yellow-500/20 text-yellow-500' :
                                                        user.status === 'blocked' ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-500'
                                                    }`}>
                                                    {user.status.replace('_', ' ')}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className={user.status === 'blocked' ? 'text-green-500 border-green-500/30' : 'text-orange-500 border-orange-500/30'}
                                                onClick={() => onUserAction(regionCode, user.id, 'block')}
                                            >
                                                {user.status === 'blocked' ? 'Unblock' : 'Block'}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                                                onClick={() => onUserAction(regionCode, user.id, 'delete')}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Documents Section for Pending Riders */}
                                    {user.status === 'pending_approval' && user.documents && (
                                        <div className="p-3 bg-muted/40 rounded-lg mt-2 border border-border">
                                            <p className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Submitted Documents</p>
                                            <div className="space-y-2 mb-3">
                                                {user.documents.map((doc, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm items-center p-2 bg-background rounded border border-border">
                                                        <span className="flex items-center gap-2 text-foreground"><Eye className="h-4 w-4 text-primary" /> {doc.type}</span>
                                                        <span className="text-xs font-bold text-primary cursor-pointer hover:underline">View File</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => onUserAction(regionCode, user.id, 'approve_doc')}
                                                >
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Approve Rider
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                                                    onClick={() => onUserAction(regionCode, user.id, 'decline_doc')}
                                                >
                                                    <X className="h-3 w-3 mr-1" /> Decline
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ))}
                            {users.filter(u => u.role !== 'admin').length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
                                    No active users or pending approvals in this region.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
