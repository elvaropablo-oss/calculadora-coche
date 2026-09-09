const GA_ID="G-EZJ4866V6M";
  const PRIVACY_KEY="costecoche_privacy_v2";
  const LEGACY_PRIVACY_KEY="costecoche_analytics_choice_v1";
  if(!localStorage.getItem(PRIVACY_KEY)){
    const legacyChoice=localStorage.getItem(LEGACY_PRIVACY_KEY);
    if(legacyChoice){
      localStorage.setItem(PRIVACY_KEY,legacyChoice);
      localStorage.removeItem(LEGACY_PRIVACY_KEY);
    }
  }
  const GA_DISABLED="ga-disable-"+GA_ID;
  window[GA_DISABLED]=localStorage.getItem(PRIVACY_KEY)!=="accepted";

  const value=id=>parseFloat(document.getElementById(id).value);

  function euro(v,d=2){
    if(!Number.isFinite(v)) return "—";
    return v.toLocaleString("es-ES",{
      style:"currency",
      currency:"EUR",
      minimumFractionDigits:d,
      maximumFractionDigits:d
    });
  }

  function number(v,d=1){
    if(!Number.isFinite(v)) return "—";
    return v.toLocaleString("es-ES",{
      minimumFractionDigits:d,
      maximumFractionDigits:d
    });
  }

  function set(id,val){
    document.getElementById(id).textContent=val;
  }

  function clearInputs(ids){
    ids.forEach(id=>document.getElementById(id).value="");
  }


  function calcFuel(){
    const km=value("fuelKm"),c=value("fuelCons"),p=value("fuelPrice");

    if(!(km>=0)||!(c>0)||!(p>0)){
      alert("Introduce valores válidos.");
      return;
    }

    const liters=km*c/100;
    const annual=liters*p;

    set("fuelAnnual",euro(annual));
    set("fuelMonthly",euro(annual/12));
    set("fuelLiters",number(liters)+" L");
    set("fuel100",euro(c*p));
    set("fuelPerKm",euro(c*p/100,3));
  }

  function clearFuel(){
    clearInputs(["fuelKm","fuelCons","fuelPrice"]);
    ["fuelAnnual","fuelMonthly","fuelLiters","fuel100","fuelPerKm"].forEach(id=>set(id,"—"));
  }


  function calcTrip(){
    const km=value("tripKm"),c=value("tripCons"),p=value("tripPrice");
    const tolls=value("tripTolls"),people=value("tripPeople");

    if(!(km>=0)||!(c>0)||!(p>0)||!(tolls>=0)||!(people>=1)){
      alert("Introduce valores válidos.");
      return;
    }

    const liters=km*c/100;
    const fuel=liters*p;
    const total=fuel+tolls;

    set("tripTotal",euro(total));
    set("tripFuel",euro(fuel));
    set("tripPerson",euro(total/people));
    set("tripLiters",number(liters)+" L");
    set("trip100",euro(c*p));
  }

  function clearTrip(){
    clearInputs(["tripKm","tripCons","tripPrice","tripTolls","tripPeople"]);
    ["tripTotal","tripFuel","tripPerson","tripLiters","trip100"].forEach(id=>set(id,"—"));
  }


  function calcCompare(){
    const km=value("cmpKm"),p=value("cmpPrice");
    const a=value("cmpA"),b=value("cmpB");

    if(!(km>=0)||!(p>0)||!(a>0)||!(b>0)){
      alert("Introduce valores válidos.");
      return;
    }

    const ca=km*a/100*p;
    const cb=km*b/100*p;
    const saving=Math.abs(ca-cb);

    set("cmpCostA",euro(ca));
    set("cmpCostB",euro(cb));
    set("cmpSaving",euro(saving));
    set("cmpWinner",ca<cb?"Coche A":cb<ca?"Coche B":"Empate");
  }

  function clearCompare(){
    clearInputs(["cmpKm","cmpPrice","cmpA","cmpB"]);
    ["cmpCostA","cmpCostB","cmpSaving","cmpWinner"].forEach(id=>set(id,"—"));
  }


  function calcTco(){
    const buy=value("tcoBuy"),resale=value("tcoResale"),years=value("tcoYears");
    const km=value("tcoKm"),c=value("tcoCons"),p=value("tcoPrice");
    const insurance=value("tcoInsurance"),maint=value("tcoMaint"),tax=value("tcoTax");

    if(!(buy>=0)||!(resale>=0)||!(years>=1)||!(km>=0)||!(c>=0)||!(p>=0)||
       !(insurance>=0)||!(maint>=0)||!(tax>=0)){
      alert("Introduce valores válidos.");
      return;
    }

    const dep=Math.max(0,buy-resale);
    const fuel=km*c/100*p*years;
    const fixed=(insurance+maint+tax)*years;
    const total=dep+fuel+fixed;
    const totalKm=km*years;

    set("tcoTotal",euro(total));
    set("tcoMonthly",euro(total/(years*12)));
    set("tcoPerKm",totalKm>0?euro(total/totalKm,3):"—");
    set("tcoDep",euro(dep));
    set("tcoFuel",euro(fuel));
  }

  function clearTco(){
    clearInputs(["tcoBuy","tcoResale","tcoYears","tcoKm","tcoCons","tcoPrice","tcoInsurance","tcoMaint","tcoTax"]);
    ["tcoTotal","tcoMonthly","tcoPerKm","tcoDep","tcoFuel"].forEach(id=>set(id,"—"));
  }


  function calcRentBuy(){
    const years=value("rbYears"),rent=value("rbRent"),buy=value("rbBuy");
    const resale=value("rbResale"),insurance=value("rbInsurance");
    const maint=value("rbMaint"),tax=value("rbTax");

    if(!(years>=1)||!(rent>=0)||!(buy>=0)||!(resale>=0)||
       !(insurance>=0)||!(maint>=0)||!(tax>=0)){
      alert("Introduce valores válidos.");
      return;
    }

    const renting=rent*12*years;
    const purchase=Math.max(0,buy-resale)+(insurance+maint+tax)*years;
    const diff=Math.abs(renting-purchase);

    set("rbWinner",renting<purchase?"Renting":purchase<renting?"Comprar":"Empate");
    set("rbRentTotal",euro(renting));
    set("rbBuyTotal",euro(purchase));
    set("rbDiff",euro(diff));
  }

  function clearRentBuy(){
    clearInputs(["rbYears","rbRent","rbBuy","rbResale","rbInsurance","rbMaint","rbTax"]);
    ["rbWinner","rbRentTotal","rbBuyTotal","rbDiff"].forEach(id=>set(id,"—"));
  }


  function loadAnalytics(){
    if(window.__costecocheGaLoaded) return;

    window.__costecocheGaLoaded=true;
    window.dataLayer=window.dataLayer||[];

    window.gtag=function(){
      dataLayer.push(arguments);
    };

    gtag("js",new Date());
    gtag("config",GA_ID,{anonymize_ip:true});

    const script=document.createElement("script");
    script.async=true;
    script.src="https://www.googletagmanager.com/gtag/js?id="+GA_ID;
    document.head.appendChild(script);
  }


  const banner=document.getElementById("cookieBanner");
  const privacyChoice=localStorage.getItem(PRIVACY_KEY);

  if(privacyChoice==="accepted"){
    loadAnalytics();
  }else if(!privacyChoice){
    banner.hidden=false;
  }

  document.getElementById("acceptAnalytics").onclick=()=>{
    localStorage.setItem(PRIVACY_KEY,"accepted");
    window[GA_DISABLED]=false;
    loadAnalytics();
    banner.hidden=true;
  };

  document.getElementById("rejectAnalytics").onclick=()=>{
    localStorage.setItem(PRIVACY_KEY,"rejected");
    window[GA_DISABLED]=true;
    banner.hidden=true;
  };



  document.querySelectorAll("[data-privacy-settings]").forEach(el=>{
    el.addEventListener("click",event=>{
      event.preventDefault();
      localStorage.removeItem(PRIVACY_KEY);
      window[GA_DISABLED]=true;
      banner.hidden=false;
    });
  });

  document.getElementById("year").textContent=new Date().getFullYear();
