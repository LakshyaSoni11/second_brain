import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { contentAPI } from "../api/axios";



export const CapturePage: React.FC = () =>{
    const [params] = useSearchParams();
    const navigate = useNavigate();

    useEffect(()=>{
        const url = params.get("url") || params.get("text") || "";
        const title = params.get("title") || decodeURIComponent(url.split("/")[2] || "untitled");
        (async () =>{
            if(!url || !/^https?:\/\//i.test(url)){
                navigate('/dashboard'); 
                return;
            }
            try {
                await contentAPI.add({type: "link", title: title.slice(0, 200), link: url, tags: []});
            } catch (error) {
                
            }
            navigate("/dashboard");
        })();

    },[params, navigate]);

    return(
         <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
    </div>
    );

};

