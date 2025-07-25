// @ts-nocheck
'use client'
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Menu, Coins, Recycle, Bell, User, ChevronDown, LogIn, LogOut, MapPin, Trash, MessageSquare, Medal, Home, Cpu } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Web3Auth } from "@web3auth/modal"
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base"
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { motion, AnimatePresence } from "framer-motion"
import { createUser, getUnreadNotifications, markNotificationAsRead, getUserByEmail, getUserBalance } from "@/utils/db/actions"

const clientId = "BPdACh0Vyfh5g-q2JzbNwlH8ZHzDPmjFzVZ7nh2wTb3R_ZtMWCRjlWhwUgtQtxRK1MZ0LvzCZMaoXu_Ftkk7FZc";

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://sepolia.infura.io/v3/66c4b1c0bfc4418a93c9949494f44d5f",
  displayName: "Ethereum Sepolia Testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.TESTNET,
  privateKeyProvider,
});

interface HeaderProps {
  onMenuClick: () => void;
  totalEarnings: number;
}

const headerLinks = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/report", icon: MapPin, label: "Report Waste" },
  { href: "/collect", icon: Trash, label: "Collect Waste" },
  { href: "/rewards", icon: Coins, label: "Rewards" },
  { href: "/leaderboard", icon: Medal, label: "Leaderboard" },
  { href: "/iot-dashboard", icon: Cpu, label: "IoT Dashboard" },
  { href: "/messages", icon: MessageSquare, label: "Help Bot" },
];

export default function Header({ onMenuClick, totalEarnings }: HeaderProps) {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    const init = async () => {
      try {
        await web3auth.initModal();
        setProvider(web3auth.provider);

        if (web3auth.connected) {
          setLoggedIn(true);
          const user = await web3auth.getUserInfo();
          setUserInfo(user);
          if (user.email) {
            localStorage.setItem('userEmail', user.email);
            try {
              const existingUser = await getUserByEmail(user.email);
              if (!existingUser) {
                await createUser(user.email, user.name || 'Anonymous User');
              }
            } catch (error) {
              console.error("Error handling user:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error initializing Web3Auth:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const fetchUserBalance = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        try {
          const user = await getUserByEmail(userEmail);
          if (user) {
            const userBalance = await getUserBalance(user.id);
            setBalance(userBalance);
          }
        } catch (error) {
          console.error('Error fetching user balance:', error);
        }
      }
    };

    fetchUserBalance();
    
    const intervalId = setInterval(fetchUserBalance, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const login = async () => {
    try {
      const web3authProvider = await web3auth.connect();
      setProvider(web3authProvider);
      setLoggedIn(true);
      const user = await web3auth.getUserInfo();
      setUserInfo(user);
      if (user.email) {
        localStorage.setItem('userEmail', user.email);
        const existingUser = await getUserByEmail(user.email);
        if (!existingUser) {
          await createUser(user.email, user.name || 'Anonymous User');
        } else {
          const userBalance = await getUserBalance(existingUser.id);
          setBalance(userBalance);
        }
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    try {
      await web3auth.logout();
      setProvider(null);
      setLoggedIn(false);
      setUserInfo(null);
      setBalance(0);
      localStorage.removeItem('userEmail');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleNotificationClick = async (notificationId: number) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prevNotifications => prevNotifications.filter(notification => notification.id !== notificationId));
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Recycle className="h-12 w-12 text-primary animate-spin-slow" />
          <p className="mt-4 text-foreground font-medium">Loading WastiFY...</p>
        </div>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md bg-[#0A0F1C]/80">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <div className="flex items-center">
                <Recycle className="h-6 w-6 text-primary mr-2" />
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-white">WastiFY</span>
                  <span className="text-[10px] text-primary/80 -mt-1 tracking-wider">ECO-FRIENDLY</span>
                </div>
              </div>
            </Link>
            
            {!isMobile && (
              <nav className="hidden md:flex items-center gap-1">
                {headerLinks.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={`header-link ${isActive ? 'active' : ''}`}>
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-white/70'}`} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-eco-gradient rounded-full px-3 py-1.5 flex items-center shadow-eco animate-pulse-glow">
              <Coins className="h-4 w-4 mr-2 text-white" />
              <span className="font-medium text-white">{balance.toFixed(0)}</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-white/80 hover:text-white">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5 bg-red-500">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-card/95 backdrop-blur-md border-white/20">
                <div className="px-4 py-3 border-b border-white/10">
                  <h3 className="font-medium text-white">Notifications</h3>
                </div>
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      onClick={() => handleNotificationClick(notification.id)}
                      className="px-4 py-3 hover:bg-white/10 cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          {notification.type === 'reward' && <Coins className="h-4 w-4 mr-2 text-primary" />}
                          {notification.type === 'collection' && <Trash className="h-4 w-4 mr-2 text-secondary" />}
                          <span className="font-medium text-white">{notification.type}</span>
                        </div>
                        <span className="text-sm text-white/70 mt-1">{notification.message}</span>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-white/60">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No new notifications</p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {loggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full px-3 py-1"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="hidden md:inline">{userInfo?.name?.split(' ')[0] || 'User'}</span>
                    <ChevronDown className="h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-md border-white/20">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-xs text-white/60">Signed in as</p>
                    <p className="font-medium text-white mt-0.5">{userInfo?.email}</p>
                  </div>
                  <DropdownMenuItem 
                    onClick={logout}
                    className="px-4 py-2.5 hover:bg-white/10 cursor-pointer text-white/80 hover:text-white"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={login} 
                className="bg-eco-gradient hover:opacity-90 text-white rounded-full px-4 py-2 font-medium shadow-eco"
              >
                <LogIn className="mr-2 h-4 w-4" />
                <span>Log In</span>
              </Button>
            )}
            
            {isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMobileMenu} 
                className="text-white/80 hover:text-white"
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isMobile && isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute top-full left-0 w-full bg-[#0A0F1C] border-b border-white/10 shadow-lg md:hidden overflow-hidden"
            >
              <nav className="flex flex-col p-4 space-y-1">
                {headerLinks.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      onClick={closeMobileMenu}
                    >
                      <div 
                        className={`flex items-center p-3 rounded-md text-base font-medium transition-colors duration-200 ${ 
                          isActive 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-white/80 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-primary' : 'text-white/60'}`} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
                <div className="pt-4 mt-4 border-t border-white/10">
                  {loggedIn ? (
                    <Button 
                      variant="ghost" 
                      onClick={() => { logout(); closeMobileMenu(); }} 
                      className="w-full justify-start text-white/80 hover:bg-destructive/20 hover:text-destructive"
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      Logout
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      onClick={() => { login(); closeMobileMenu(); }} 
                      className="w-full justify-start text-white/80 hover:bg-primary/10 hover:text-primary"
                    >
                      <LogIn className="mr-3 h-5 w-5" />
                      Login
                    </Button>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
