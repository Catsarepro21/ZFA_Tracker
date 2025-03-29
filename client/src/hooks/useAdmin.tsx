import { useState, useEffect } from 'react';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  
  // Check if admin status is stored in localStorage on initial load
  useEffect(() => {
    const storedAdminStatus = localStorage.getItem('isAdmin');
    const storedPassword = localStorage.getItem('adminPassword');
    
    if (storedAdminStatus === 'true' && storedPassword) {
      setIsAdmin(true);
      setPassword(storedPassword);
    }
  }, []);
  
  const verifyAdmin = (status: boolean, adminPassword?: string) => {
    setIsAdmin(status);
    
    if (status && adminPassword) {
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('adminPassword', adminPassword);
      setPassword(adminPassword);
    } else if (!status) {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminPassword');
      setPassword('');
    }
  };
  
  const logout = () => {
    verifyAdmin(false);
  };
  
  return {
    isAdmin,
    password,
    verifyAdmin,
    logout
  };
}
