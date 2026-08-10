
import { Link, useLocation } from "react-router-dom";
import { UserNav } from "./UserNav";
import { OrganizationSelector } from "./organizations/OrganizationSelector";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "@/contexts/AuthContext";
import { 
  NavigationMenu, 
  NavigationMenuItem, 
  NavigationMenuList,
  NavigationMenuLink,
  navigationMenuTriggerStyle
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export const Header = () => {
  const { userRole } = useAuth();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <img 
              src="/lovable-uploads/d3c178bd-e905-4e9f-aea6-25fff0b49ef5.png" 
              alt="Domotai" 
              className="h-8 w-auto"
            />
          </Link>
          
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink 
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    isActive("/") && "bg-accent text-accent-foreground"
                  )}
                >
                  <Link to="/">Dashboard</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuLink 
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    isActive("/leads") && "bg-accent text-accent-foreground"
                  )}
                >
                  <Link to="/leads">Leads</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuLink 
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    isActive("/contacts") && "bg-accent text-accent-foreground"
                  )}
                >
                  <Link to="/contacts">Contacts</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuLink 
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    isActive("/tasks") && "bg-accent text-accent-foreground"
                  )}
                >
                  <Link to="/tasks">Tasks</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuLink 
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    isActive("/project-dashboard") && "bg-accent text-accent-foreground"
                  )}
                >
                  <Link to="/project-dashboard">Projects</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="hidden md:flex items-center space-x-2">
            <GlobalSearch />
          </div>
          <div className="flex items-center space-x-2">
            <OrganizationSelector />
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
};
