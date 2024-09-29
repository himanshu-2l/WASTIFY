// @ts-nocheck
'use client'
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Menu, Coins, Leaf, Bell, User, ChevronDown, LogIn, LogOut, MapPin, Trash, MessageSquare, Medal, Home } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Web3Auth } from "@web3auth/modal"
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base"
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { createUser, getUnreadNotifications, markNotificationAsRead, getUserByEmail, getUserBalance } from "@/utils/db/actions"

const clientId = "BPdACh0Vyfh5g-q2JzbNwlH8ZHzDPmjFzVZ7nh2wTb3R_ZtMWCRjlWhwUgtQtxRK1MZ0LvzCZMaoXu_Ftkk7FZc";

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
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
  web3AuthNetwork: WEB3AUTH_NETWORK.TESTNET, // Changed from SAPPHIRE_MAINNET to TESTNET
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
  { href: "/messages", icon: MessageSquare, label: "Help Bot" },
];

export default function Header({ onMenuClick, totalEarnings }: HeaderProps) {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const pathname = usePathname()
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
              await createUser(user.email, user.name || 'Anonymous User');
            } catch (error) {
              console.error("Error creating user:", error);
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

  const login = async () => {
    try {
      const web3authProvider = await web3auth.connect();
      setProvider(web3authProvider);
      setLoggedIn(true);
      const user = await web3auth.getUserInfo();
      setUserInfo(user);
      if (user.email) {
        localStorage.setItem('userEmail', user.email);
        await createUser(user.email, user.name || 'Anonymous User');
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
      localStorage.removeItem('userEmail');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleNotificationClick = async (notificationId: number) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prevNotifications => prevNotifications.filter(notification => notification.id !== notificationId));
  };

  if (loading) {
    return <div>Loading Web3Auth...</div>;
  }

   return (
    <header className="bg-gray-900 border-b border-gray-900 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <div className="flex flex-col">
              <span className="font-bold text-base md:text-lg text-white">WastiFY</span>
              <span className="text-[8px] md:text-[10px] text-gray-300 -mt-1">ECO-FRIENDLY</span>
            </div>
          </Link>
          <div className="flex items-center ml-4">
            {headerLinks.map((item) => (
              <Link key={item.href} href={item.href} className="ml-4">
                <Button variant={pathname === item.href ? "secondary" : "ghost"} className="flex items-center text-pink-500"> {/* Change button text to pink */}
                  <item.icon className="mr-2 h-5 w-5 text-purple-600" /> {/* Change icon color to pink */}
                  <span className="text-purple-600">{item.label}</span> {/* Change to pink */}
                </Button>
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center">
          {/* Notifications and other elements remain unchanged */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 relative">
                <Bell className="h-5 w-5 text-purple-600" /> {/* Change bell icon color to pink */}
                {notifications.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} onClick={() => handleNotificationClick(notification.id)}>
                    <div className="flex flex-col">
                      <span className="font-medium text-purple-600">{notification.type}</span> {/* Change to pink */}
                      <span className="text-sm text-gray-500">{notification.message}</span>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem>No new notifications</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="mr-2 md:mr-4 flex items-center bg-gray-900 rounded-full px-2 md:px-3 py-1">
            <Coins className="h-4 w-4 md:h-5 md:w-5 mr-1 text-purple-600" />
            <span className="font-semibold text-sm md:text-base text-purple-600">
              {balance.toFixed(2)}
            </span>
          </div>

          {loggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <User className="h-5 w-5 text-purple-600" />
                  <ChevronDown className="ml-1 h-4 w-4 text-purple-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-purple-600" />
                    <p className="text-purple-600">{userInfo?.name || 'Anonymous'}</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4 text-purple-600" />
                  <span className="text-purple-600">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="secondary" onClick={login} className="text-purple-600"> {/* Change button text to pink */}
              <LogIn className="mr-2 h-4 w-4 text-purple-600" /> {/* Change login icon color to pink */}
              <span className="text-purple-600">Log In</span> {/* Change to pink */}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
