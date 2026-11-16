import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.35 : 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8299a5);
scene.fog = new THREE.FogExp2(0x9da7a4, 0.00135);
const skyCanvas=document.createElement('canvas');skyCanvas.width=8;skyCanvas.height=256;
const skyContext=skyCanvas.getContext('2d');
const skyGradient=skyContext.createLinearGradient(0,0,0,256);
skyGradient.addColorStop(0,'#243c5a');skyGradient.addColorStop(.42,'#52778a');skyGradient.addColorStop(.72,'#e1a47d');skyGradient.addColorStop(1,'#e4c39a');
skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,8,256);
const skyTexture=new THREE.CanvasTexture(skyCanvas);skyTexture.colorSpace=THREE.SRGBColorSpace;
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(850,24,16),new THREE.MeshBasicMaterial({map:skyTexture,side:THREE.BackSide,depthWrite:false,fog:false}));
skyDome.frustumCulled=false;skyDome.renderOrder=-100;scene.add(skyDome);
const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 900);
const clock = new THREE.Clock();
const world = new THREE.Group(); scene.add(world);
const mat = (color, roughness=.75, metalness=0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const mats = {
  asphalt: mat(0x31383a), sidewalk: mat(0xaaa99c), concrete: mat(0xc0bcae), white: mat(0xe8e5d7), dark: mat(0x182024,.42), glass: new THREE.MeshPhysicalMaterial({color:0x53717a, roughness:.18, metalness:.15, transmission:.12, transparent:true, opacity:.84}),
  tire: mat(0x121619,.88), chrome: mat(0xa6b7b5,.25,.78), lane: mat(0xd7d1b3), grass: mat(0x71866c), trunk: mat(0x624b38), leaf: mat(0x426e5b), neon: new THREE.MeshStandardMaterial({color:0xc9f76a,emissive:0x87b32c,emissiveIntensity:1.2}),
};
const hemi = new THREE.HemisphereLight(0xcce7ff,0x776047,2.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd4a0,3.2); sun.position.set(-100,150,60); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-160; sun.shadow.camera.right=160; sun.shadow.camera.top=160; sun.shadow.camera.bottom=-160; sun.shadow.bias=-.0002; scene.add(sun);
const fill = new THREE.DirectionalLight(0x86baff,1.05); fill.position.set(80,60,-100); scene.add(fill);
const addMesh=(geo,material,parent=world,pos=[0,0,0],cast=true,receive=true)=>{const m=new THREE.Mesh(geo,material);m.position.set(...pos);m.castShadow=cast;m.receiveShadow=receive;parent.add(m);return m};
const box=(w,h,d,material,parent=world,pos=[0,0,0],cast=true)=>addMesh(new THREE.BoxGeometry(w,h,d),material,parent,pos,cast);
const rng=(n)=>{let x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const buildingCollisions=[];
function makeBuilding(x,z,w,d,h,seed){
  const palette=[0xbba995,0xd1c7b2,0xa9b8b2,0xc0ad9a,0x8d9c9b,0xd2c6af,0x9ba9ad];
  const base=mat(palette[Math.floor(rng(seed)*palette.length)],.83); const body=box(w,h,d,base,world,[x,h/2,z]);
  buildingCollisions.push({x,z,hw:w/2,hd:d/2});
  body.castShadow=true;
  const roof=box(w+1.3,.75,d+1.3,mat(0x515b59),world,[x,h+.35,z]);
  // Recessed, colored window strips give every facade a designed, non-cubemap look.
  const rows=Math.max(2,Math.floor((h-5)/4.3)); const cols=Math.max(2,Math.floor(w/4.2));
  const windowMat=mat([0x38545c,0x557078,0x3e5960][Math.floor(rng(seed+5)*3)],.27,.12);
  const warmWindow=mat(0xd79c5a,.3,.08);warmWindow.emissive.setHex(0x9a5420);warmWindow.emissiveIntensity=.38;
  const trimMat=mat(0xe4ddca,.65);
  for(let row=0;row<rows;row++) for(let col=0;col<cols;col++){
    const yy=3.1+row*4.15, xx=x-w/2+2.2+col*((w-4.4)/Math.max(1,cols-1));
    if(yy>h-1)continue;
    const ww=Math.min(1.65,(w-3)/cols*.6), wh=1.6;
    const lit=rng(seed+row*31+col*13)>.76, pane=lit?warmWindow:windowMat;
    box(ww,wh,.12,pane,world,[xx,yy,z+d/2+.065],false);
    box(.07,wh+.16,.15,trimMat,world,[xx,yy,z+d/2+.14],false);
    if(rng(seed+row*31+col*13)>.55)box(ww,.08,.16,trimMat,world,[xx,yy-wh/2-.06,z+d/2+.14],false);
    box(.12,wh,.08,rng(seed+row*31+col*13)>.82?warmWindow:windowMat,world,[x+w/2+.06,yy,z-d/2+2.1+col*(d-4)/Math.max(cols-1,1)],false);
  }
  // Compact rooftop plant rooms add a more believable skyline without heavy geometry.
  if(h>27){
    const unitW=Math.min(5,w*.28),unitD=Math.min(4,d*.24);
    box(unitW,1.8,unitD,mat(0x626967,.82),world,[x-w*.24,h+1.25,z-d*.22]);
    box(unitW*.72,.45,unitD*.7,mat(0x858780,.72),world,[x+w*.2,h+.58,z+d*.2]);
  }
  // Awning and lit storefront.
  if(h<25){box(w*.78,2.4,.15,mat(0x38494a),world,[x,2.5,z+d/2+.08],false);box(w*.86,.35,1.2,mat(0xd5a85e),world,[x,4,z+d/2+.52],false);}
  return body;
}
function addPalm(x,z,scale=1){
  const trunk=addMesh(new THREE.CylinderGeometry(.28*scale,.48*scale,5.3*scale,7),mats.trunk,world,[x,2.65*scale,z]);
  trunk.rotation.z=(rng(x+z)*.12-.06);
  const crown=new THREE.Group();world.add(crown);crown.position.set(x,5.05*scale,z);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const leaf=addMesh(new THREE.ConeGeometry(.38*scale,4.4*scale,5),mats.leaf,crown,[Math.sin(a)*1.5*scale,-.25*scale,Math.cos(a)*1.5*scale],false);leaf.rotation.z=Math.PI/2-Math.sin(a)*.67;leaf.rotation.x=Math.cos(a)*.67;}
}
function makeCity(){
  // Broad coastal grass plane and an orthogonal network of streets.
  addMesh(new THREE.PlaneGeometry(600,600),mats.grass,world,[0,-.18,0],false).rotation.x=-Math.PI/2;
  for(let n=-3;n<=3;n++){
    const p=n*70;
    box(15,.12,600,mats.asphalt,world,[p,-.06,0],false); box(600,.12,15,mats.asphalt,world,[0,-.06,p],false);
    // Dashed center lines and subtle shoulder markings make lanes easier to read.
    for(let k=-11;k<=11;k++){box(.18,.025,3.3,mats.lane,world,[p,-.0,k*25+12],false);box(3.3,.025,.18,mats.lane,world,[k*25+12,-.0,p],false);}
    for(const side of [-1,1]){
      box(.12,.018,600,mats.lane,world,[p+side*6.6,.005,0],false);
      box(600,.018,.12,mats.lane,world,[0,.005,p+side*6.6],false);
      box(2,.32,600,mats.sidewalk,world,[p+side*9,-.08,0],false);box(600,.32,2,mats.sidewalk,world,[0,-.08,p+side*9],false);
    }
  }
  const crossingMat=new THREE.MeshStandardMaterial({color:0xd9d3ba,roughness:.78});
  for(let ix=-3;ix<=3;ix+=2)for(let iz=-3;iz<=3;iz+=2){
    const x=ix*70,z=iz*70;
    for(let stripe=-2;stripe<=2;stripe++){
      box(1.35,.025,.24,crossingMat,world,[x+stripe*2.35,.018,z-5.65],false);
      box(.24,.025,1.35,crossingMat,world,[x-5.65,.018,z+stripe*2.35],false);
    }
  }
  // Urban blocks, with varied setbacks, rooftops, and tiny planted pocket parks.
  for(let ix=-3;ix<3;ix++)for(let iz=-3;iz<3;iz++){
    const cx=ix*70+35,cz=iz*70+35,seed=(ix+5)*19+(iz+5)*43;
    if(Math.abs(cx)<30&&Math.abs(cz)<27)continue;
    if(rng(seed)>.71){
      box(36,.22,34,mats.grass,world,[cx,-.02,cz],false);
      for(let t=0;t<4;t++)addPalm(cx-12+(t%2)*24,cz-10+Math.floor(t/2)*20,.72);
      for(let t=0;t<3;t++){const x=cx-7+t*7;addMesh(new THREE.SphereGeometry(2.2,8,6),mats.leaf,world,[x,1.5,cz+2]);box(.4,2.5,.4,mats.trunk,world,[x,.9,cz+2]);}
    }else{
      const count=1+Math.floor(rng(seed+2)*2);
      for(let b=0;b<count;b++){
        const bw=count===1?34:15+Math.floor(rng(seed+b+4)*7),bd=count===1?34:27;
        const x=cx+(b-(count-1)/2)*19+(rng(seed+8)*4-2),z=cz+(rng(seed+9)*7-3);
        makeBuilding(x,z,bw,bd,11+rng(seed+b*5)*46,seed+b*71);
      }
    }
  }
  // Street lights on every second corner, plus coastal palms along the boulevard.
  const lampMat=mat(0x4a5351,.35,.55),bulb=new THREE.MeshBasicMaterial({color:0xffe6a3});
  for(let x=-210;x<=210;x+=70)for(let z=-210;z<=210;z+=70){
    for(const s of [-1,1]){
      const lx=x+s*11,lz=z+11;
      addMesh(new THREE.CylinderGeometry(.09,.15,6.4,7),lampMat,world,[lx,3.2,lz]);
      const arm=box(.12,.12,1.6,lampMat,world,[lx,6.3,lz+.7]);
      addMesh(new THREE.SphereGeometry(.23,8,8),bulb,world,[lx,6.1,lz+1.35],false);
    }
  }
  for(let z=-250;z<=250;z+=24){addPalm(-224,z,1.05);addPalm(224,z,1.05);}
}
makeCity();

const catalog=[
 {id:'coupe',name:'Vesper GT',type:'COUPE · STREET',kind:'car',price:0,color:0xd9e1d1,top:0x394b50,speed:178,accel:28,handling:2.2,desc:'A quick, balanced city coupe.'},
 {id:'sport',name:'Apex R',type:'SPORT · TRACK',kind:'car',price:950,color:0xe75d43,top:0x292f33,speed:245,accel:39,handling:2.65,desc:'Low, loud, and built to run.'},
 {id:'bike',name:'Riot 900',type:'MOTORCYCLE · SPORT',kind:'bike',price:650,color:0xd5fa63,top:0x283638,speed:215,accel:47,handling:3.1,desc:'The long way around is the fun way.'}
];
function bevelBox(w,h,d,r,material,parent,pos){
  const shape=new THREE.Shape(); const x=-w/2,y=-h/2;
  shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r,bevelThickness:r,curveSegments:4});
  const mesh=addMesh(geo,material,parent,[pos[0],pos[1],pos[2]-(d-2*r)/2],true);
  mesh.geometry.computeVertexNormals();return mesh;
}
function createVehicle(def,parent=world){
  const root=new THREE.Group();parent.add(root);root.userData.vehicle=def;
  const paint=new THREE.MeshPhysicalMaterial({color:def.color,roughness:.27,metalness:.48,clearcoat:.85,clearcoatRoughness:.2});
  const accent=new THREE.MeshStandardMaterial({color:def.top,roughness:.3,metalness:.16});
  const light=new THREE.MeshStandardMaterial({color:0xffe6ba,emissive:0xffc86c,emissiveIntensity:2.8});
  const red=new THREE.MeshStandardMaterial({color:0xe74432,emissive:0x8e1309,emissiveIntensity:1.5});
  const wheelMat=new THREE.MeshStandardMaterial({color:0x14191c,roughness:.83});
  if(def.kind==='car'){
    const sport=def.id==='sport', length=sport?4.7:4.35,width=sport?1.94:1.86;
    bevelBox(width,.58,length,.12,paint,root,[0,.78,0]);
    bevelBox(width*.88,.36,length*.67,.12,paint,root,[0,1.12,-.05]);
    // Tapered cabin from a custom four-corner silhouette.
    const cabin=new THREE.BufferGeometry();
    const verts=new Float32Array([-width*.39,1.28,-.73,width*.39,1.28,-.73,-width*.30,1.95,-.43,width*.30,1.95,-.43,-width*.30,1.95,.62,width*.30,1.95,.62,-width*.4,1.25,1.1,width*.4,1.25,1.1]);
    const indices=[0,1,3,0,3,2,2,3,5,2,5,4,4,5,7,4,7,6,6,7,1,6,1,0,2,4,6,2,6,0,3,1,7,3,7,5];cabin.setAttribute('position',new THREE.BufferAttribute(verts,3));cabin.setIndex(indices);cabin.computeVertexNormals();addMesh(cabin,accent,root,[0,0,0]);
    // Glazing planes, bright beltline, grille, mirrors, and sculpted wheel arches.
    const glass=new THREE.MeshPhysicalMaterial({color:0x8fc0c9,roughness:.14,metalness:.05,transparent:true,opacity:.65,side:THREE.DoubleSide});
    const wind=addMesh(new THREE.PlaneGeometry(width*.56,.6),glass,root,[0,1.64,.77],false);wind.rotation.x=-.58;
    const rear=addMesh(new THREE.PlaneGeometry(width*.57,.53),glass,root,[0,1.64,-.6],false);rear.rotation.x=.58;
    for(const side of [-1,1]){
      const win=addMesh(new THREE.PlaneGeometry(.76,.52),glass,root,[side*(width*.385),1.63,.02],false);win.rotation.y=side*Math.PI/2;
      for(const z of [-1.34,1.35]){
        const tire=addMesh(new THREE.CylinderGeometry(.39,.39,.25,20),wheelMat,root,[side*(width/2-.02),.55,z]);tire.rotation.z=Math.PI/2;
        const hub=addMesh(new THREE.CylinderGeometry(.2,.2,.27,12),mat(0x929d9d,.24,.8),root,[side*(width/2+.015),.55,z]);hub.rotation.z=Math.PI/2;
        const rim=addMesh(new THREE.TorusGeometry(.245,.025,8,18),mats.chrome,root,[side*(width/2+.16),.55,z]);rim.rotation.y=Math.PI/2;
      }
      box(.12,.1,.28,paint,root,[side*width*.53,1.32,-.32]);
      box(.08,.07,.5,mats.chrome,root,[side*(width/2),.9,0]);
    }
    for(const side of [-1,1]){box(.38,.17,.08,light,root,[side*.55,1.02,length/2+.02],false);box(.33,.16,.08,red,root,[side*.6,1.02,-length/2-.02],false);}
    box(.6,.12,.1,mats.dark,root,[0,.73,length/2+.035],false);
    if(sport){box(1.7,.09,.16,accent,root,[0,1.47,-2.16]);for(const x of [-.67,.67])addMesh(new THREE.CylinderGeometry(.035,.035,.16,8),mats.chrome,root,[x,.79,-2.15]);}
  }else{
    // A purpose-built naked sportbike: two rubber wheels, forks, swingarm, frame, tank, seat and controls.
    for(const z of [-1.15,1.05]){
      const tire=addMesh(new THREE.TorusGeometry(.49,.12,10,24),wheelMat,root,[0,.55,z]);tire.rotation.y=Math.PI/2;
      const rim=addMesh(new THREE.TorusGeometry(.34,.035,8,18),mat(0x9ca8a4,.25,.78),root,[0,.55,z]);rim.rotation.y=Math.PI/2;
      for(let s=0;s<8;s++){const a=s*Math.PI/4;const spoke=box(.035,.62,.035,mats.chrome,root,[0,.55,z]);spoke.rotation.x=a;}
    }
    // fork, rear swingarm, frame triangles
    for(const x of [-.18,.18]){const fork=addMesh(new THREE.CylinderGeometry(.045,.065,1.15,8),mats.chrome,root,[x,.98,.69]);fork.rotation.x=-.35;}
    const arm=addMesh(new THREE.CylinderGeometry(.07,.07,1.18,7),accent,root,[0,.66,-.1]);arm.rotation.x=-.4;
    const frame=addMesh(new THREE.CylinderGeometry(.055,.055,1.15,7),mats.chrome,root,[0,.94,-.18]);frame.rotation.x=.78;
    bevelBox(.58,.42,.8,.1,paint,root,[0,1.28,.2]);
    bevelBox(.53,.19,.72,.07,accent,root,[0,1.42,-.45]);
    const engine=addMesh(new THREE.CylinderGeometry(.37,.37,.48,12),mat(0x5b6464,.36,.62),root,[0,.88,-.15]);engine.rotation.z=Math.PI/2;
    const exhaust=addMesh(new THREE.CylinderGeometry(.09,.13,.92,10),mats.chrome,root,[.27,.68,-.52]);exhaust.rotation.x=Math.PI/2+.1;
    const bar=box(.95,.06,.08,mats.chrome,root,[0,1.55,.79]);
    for(const x of [-.44,.44]){addMesh(new THREE.SphereGeometry(.08,10,8),mats.dark,root,[x,1.56,.8]);}
    addMesh(new THREE.SphereGeometry(.16,12,10),light,root,[0,1.37,.64],false);
    box(.38,.12,.08,red,root,[0,1.31,-.85],false);
  }
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return root;
}

// A recognizable roadside dealership and an outdoor vehicle lineup.
const garageX=27, garageZ=4;
box(24,.5,16,mat(0x515b59),world,[garageX,.1,garageZ+14]);
box(22,8,1,mat(0x283638),world,[garageX,4,garageZ+6]);
buildingCollisions.push({x:garageX,z:garageZ+14,hw:12,hd:8.5});
box(24,.5,17,mat(0x354245),world,[garageX,8.2,garageZ+13]);
box(11,5,.25,mat(0x426067,.2,.08),world,[garageX,3.8,garageZ+5.4],false);
box(12,.17,.22,mats.neon,world,[garageX,6.6,garageZ+5.2],false);
for(let i=-1;i<=1;i++)box(.1,4.6,.15,mat(0x84989a,.3,.5),world,[garageX+i*3.8,3.8,garageZ+5.15],false);
const sign=box(15,.85,.35,mat(0x172125),world,[garageX,9.3,garageZ+7]);
// Simple illuminated entry mark.
const garageLight=new THREE.PointLight(0xc9f76a,28,18);garageLight.position.set(garageX,6,garageZ+1);world.add(garageLight);
const displayVehicles=[];
for(let i=0;i<catalog.length;i++){
  const def=catalog[i],vehicle=createVehicle(def);
  vehicle.position.set(garageX-8+i*8,.15,garageZ-3.1);vehicle.rotation.y=Math.PI;
  displayVehicles.push(vehicle);
}
const playerDef=catalog[0];
let player=createVehicle(playerDef);player.position.set(0,.15,0);player.rotation.y=0;
let activeDef=playerDef, speed=0, cash=2500, started=false, shopOpen=false, toastTimer=0;
const keys=new Set(), touch=new Set();
let firstPerson=false;
let cameraYawOffset=0;
let cameraPitch=0;
const $=s=>document.querySelector(s);
const menu=$('#menu'),hud=$('#hud'),shop=$('#shop'),prompt=$('#shop-prompt');
function showToast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');toastTimer=2.1;}
function updateWallet(){ $('#cash').textContent=cash.toLocaleString('en-US'); }
function startGame(){started=true;menu.classList.add('hidden');hud.classList.remove('hidden');showToast('WELCOME TO SUNSET DISTRICT');}
$('#start-button').addEventListener('click',startGame);
function vehicleArt(kind,color){
 const fill='#'+color.toString(16).padStart(6,'0');
 return kind==='bike'?`<svg viewBox="0 0 220 100" aria-hidden="true"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="${fill}"/><stop offset="1" stop-color="#263337"/></linearGradient></defs><g fill="none" stroke="#b6c4bd" stroke-width="3"><circle cx="53" cy="69" r="24"/><circle cx="169" cy="69" r="24"/><path d="M53 69 91 42 122 67 86 69 111 42 151 43 169 69M111 42 104 30M94 30h25"/></g><path fill="url(#g)" d="m88 39 28-10 26 10-10 12-36 1z"/><path fill="#d5fa63" d="m142 39 18-3-7 9h-12z"/><path fill="#e6e9df" d="M83 68h36l-5 5H84z"/></svg>`:`<svg viewBox="0 0 240 100" aria-hidden="true"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="${fill}"/><stop offset="1" stop-color="#243135"/></linearGradient></defs><g fill="#11191c" stroke="#96a5a1" stroke-width="3"><circle cx="57" cy="72" r="19"/><circle cx="182" cy="72" r="19"/></g><path fill="url(#g)" d="m24 67 8-20 35-6 28-23h48l28 22 40 6 8 21-14 3a23 23 0 0 0-46 0H82a23 23 0 0 0-46 0z"/><path fill="#9fc4c8" opacity=".8" d="m103 22 39 1 21 20H84z"/><path fill="#f2d89e" d="M27 50h14v6H25z"/><path fill="#ee5844" d="M205 50h12v6h-13z"/><path fill="#d5fa63" d="m64 61 116 0 4 5H61z"/></svg>`;
}
function openShop(){if(shopOpen)return;shopOpen=true;shop.classList.remove('hidden');buildShopCards();}
function closeShop(){shopOpen=false;shop.classList.add('hidden');}
function buildShopCards(){
 const list=$('#vehicle-list');list.innerHTML='';
 for(const def of catalog){
   const owned=def.id===activeDef.id;
   const card=document.createElement('button');card.className='vehicle-card'+(owned?' selected':'');card.type='button';
   card.innerHTML=`<span class="vehicle-class">${def.kind==='bike'?'TWO WHEELS':'FOUR WHEELS'} / ${def.id==='coupe'?'01':def.id==='sport'?'02':'03'}</span><div class="vehicle-art">${vehicleArt(def.kind,def.color)}</div><div class="vehicle-info"><div><h3>${def.name}</h3><p>${def.type}</p></div><div class="vehicle-price">${owned?'ACTIVE':def.price===0?'OWNED':'$'+def.price.toLocaleString()}<small>${owned?'YOUR RIDE':def.desc.toUpperCase()}</small></div></div>`;
   card.addEventListener('click',()=>selectVehicle(def));list.append(card);
 }
}
function selectVehicle(def){
 if(def.id!==activeDef.id&&cash<def.price){showToast('NOT ENOUGH CASH — KEEP EXPLORING');return;}
 if(def.id!==activeDef.id){cash-=def.price;updateWallet();world.remove(player);activeDef=def;player=createVehicle(def);player.position.set(garageX-8+catalog.indexOf(def)*8,.15,garageZ-3.1);player.rotation.y=Math.PI;speed=0;}
 $('#vehicle-name').textContent=def.type;showToast(`${def.name.toUpperCase()} READY TO DRIVE`);buildShopCards();
}
$('#close-shop').addEventListener('click',closeShop);
$('#map-button').addEventListener('click',()=>showToast(`SUNSET DISTRICT  ·  ${Math.round(player.position.x)} / ${Math.round(player.position.z)}`));
const cameraModeButton=$('#camera-mode');
cameraModeButton.addEventListener('click',()=>{
 firstPerson=!firstPerson;
 cameraModeButton.textContent=firstPerson?'3P':'1P';
 cameraModeButton.setAttribute('aria-label',firstPerson?'Switch to third-person camera':'Switch to first-person camera');
 cameraModeButton.title=firstPerson?'Switch to third-person camera':'Switch to first-person camera';
 showToast(firstPerson?'FIRST-PERSON VIEW':'THIRD-PERSON VIEW');
});
const cameraLook=$('#camera-look');
let cameraPointer=null,cameraLastX=0,cameraLastY=0;
cameraLook.addEventListener('pointerdown',e=>{
 if(cameraPointer!==null||e.pointerType==='mouse'&&e.button!==0)return;
 cameraPointer=e.pointerId;cameraLastX=e.clientX;cameraLastY=e.clientY;
 cameraLook.classList.add('dragging');
 cameraLook.setPointerCapture(e.pointerId);
});
cameraLook.addEventListener('pointermove',e=>{
 if(e.pointerId!==cameraPointer)return;
 cameraYawOffset-=(e.clientX-cameraLastX)*.0045;
 cameraPitch=THREE.MathUtils.clamp(cameraPitch-(e.clientY-cameraLastY)*.0035,firstPerson?-.65:-.3,.65);
 cameraLastX=e.clientX;cameraLastY=e.clientY;
});
const endCameraDrag=e=>{
 if(e.pointerId!==cameraPointer)return;
 cameraPointer=null;
 cameraLook.classList.remove('dragging');
};
cameraLook.addEventListener('pointerup',endCameraDrag);
cameraLook.addEventListener('pointercancel',endCameraDrag);
cameraLook.addEventListener('lostpointercapture',endCameraDrag);
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase();
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
 keys.add(key);
 if(e.repeat)return;
 if(key==='escape'&&shopOpen){closeShop();return;}
 if((key==='e'||key==='enter')&&started){if(shopOpen)closeShop();else if(player.position.distanceTo(new THREE.Vector3(garageX,0,garageZ))<19)openShop();else showToast('THE GARAGE IS MARKED WITH A LIME SIGN');}
 if(key==='escape'&&!started)startGame();
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
const activePointers=new Map();
for(const btn of document.querySelectorAll('[data-control]')){
 const action=btn.dataset.control;
 const down=e=>{
  e.preventDefault();
  if(activePointers.has(e.pointerId))return;
  activePointers.set(e.pointerId,action);touch.add(action);
  try{btn.setPointerCapture(e.pointerId);}catch{}
 };
 const up=e=>{
  e.preventDefault();
  activePointers.delete(e.pointerId);
  if(![...activePointers.values()].includes(action))touch.delete(action);
 };
 btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('lostpointercapture',up);
}
const releaseControls=()=>{touch.clear();keys.clear();activePointers.clear();cameraPointer=null;cameraLook.classList.remove('dragging');};
window.addEventListener('blur',releaseControls);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseControls();});
$('#touch-shop').addEventListener('pointerdown',e=>{e.preventDefault();if(player.position.distanceTo(new THREE.Vector3(garageX,0,garageZ))<19)openShop();else showToast('DRIVE TO THE GARAGE');});

// Ambient cross traffic makes the grid feel inhabited without distracting from driving.
const traffic=[];
for(let i=0;i<5;i++){
 const def={...catalog[i%2],id:'traffic'+i,color:[0x638d9a,0xd3a35b,0x899487,0xa35e50,0x42545d][i],top:0x273337};
 const car=createVehicle(def);const lane=i%2===0;car.position.set(lane?-105+i*17:70+(i-2)*2,.1,lane?70+(i-2)*1.8:150-i*55);car.rotation.y=lane?Math.PI/2:Math.PI;traffic.push({car,lane,speed:5+i*1.3,offset:car.position.clone()});
}
// Coastal edge and warm sun disk create a deep, readable horizon.
const ocean=addMesh(new THREE.PlaneGeometry(1800,1800),mat(0x567c85,.34,.12),world,[0,-.28,0],false);ocean.rotation.x=-Math.PI/2;
const sunDisk=addMesh(new THREE.SphereGeometry(12,20,16),new THREE.MeshBasicMaterial({color:0xffd49a}),world,[-160,88,230],false);
sunDisk.material.transparent=true;sunDisk.material.opacity=.8;

function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
function isDown(...names){return names.some(n=>keys.has(n)||touch.has(n));}
const cameraTarget=new THREE.Vector3();
function updateGame(dt){
 if(!started||shopOpen)return;
 const throttle=isDown('w','arrowup','forward')?1:0, reverse=isDown('s','arrowdown','back')?1:0;
 const left=isDown('a','arrowleft','left')?1:0,right=isDown('d','arrowright','right')?1:0,hand=isDown(' ','brake');
 const maxSpeed=activeDef.speed/3.6;
 if(throttle)speed=Math.min(maxSpeed,speed+activeDef.accel*dt);
 else if(reverse)speed=Math.max(-maxSpeed*.34,speed-activeDef.accel*.72*dt);
 else speed*=Math.max(0,1-(hand?4.8:1.15)*dt);
 if(hand)speed*=Math.max(0,1-2.2*dt);
 if(Math.abs(speed)<.035)speed=0;
 const steering=right-left;
 const speedGrip=.2+.8*Math.min(1,Math.abs(speed)/12);
 const turnRate=activeDef.handling*.55*speedGrip;
 player.rotation.y+=steering*turnRate*dt*Math.sign(speed||1);
 const previous=player.position.clone();
 player.position.x+=Math.sin(player.rotation.y)*speed*dt;
 player.position.z+=Math.cos(player.rotation.y)*speed*dt;
 player.position.x=THREE.MathUtils.clamp(player.position.x,-264,264);player.position.z=THREE.MathUtils.clamp(player.position.z,-264,264);
 let hit=false;
 for(const b of buildingCollisions){if(Math.abs(player.position.x-b.x)<b.hw+1.5&&Math.abs(player.position.z-b.z)<b.hd+2.35){hit=true;break;}}
 if(hit){player.position.copy(previous);speed*=-.13;if(Math.abs(speed)<2)speed=0;}
 // Tiny body lean makes cornering feel responsive, especially on the motorcycle.
 player.rotation.z=THREE.MathUtils.damp(player.rotation.z,-steering*Math.min(.11,Math.abs(speed)/65)*(activeDef.kind==='bike'?1.5:.6),5,dt);
 for(const t of traffic){
  if(t.lane){t.car.position.x+=t.speed*dt;if(t.car.position.x>230)t.car.position.x=-230;}
  else{t.car.position.z-=t.speed*dt;if(t.car.position.z<-230)t.car.position.z=230;}
 }
 const viewYaw=player.rotation.y+cameraYawOffset;
 if(firstPerson){
  const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
  const desired=player.position.clone().add(new THREE.Vector3(0,1.35,0)).addScaledVector(forward,.48);
  const lookDirection=new THREE.Vector3(Math.sin(viewYaw)*Math.cos(cameraPitch),Math.sin(cameraPitch),Math.cos(viewYaw)*Math.cos(cameraPitch));
  camera.position.lerp(desired,1-Math.exp(-12*dt));cameraTarget.copy(desired).addScaledVector(lookDirection,12);
 }else{
  const horizontal=10.8*Math.cos(.464+cameraPitch),vertical=10.8*Math.sin(.464+cameraPitch);
  const desired=player.position.clone().add(new THREE.Vector3(-Math.sin(viewYaw)*horizontal,vertical,-Math.cos(viewYaw)*horizontal));
  desired.y+=Math.min(.7,Math.abs(speed)*.018);
  const target=player.position.clone().add(new THREE.Vector3(0,1.8,0)).add(new THREE.Vector3(Math.sin(viewYaw)*2,0,Math.cos(viewYaw)*2));
  camera.position.lerp(desired,1-Math.exp(-4.3*dt));cameraTarget.lerp(target,1-Math.exp(-5*dt));
 }
 camera.lookAt(cameraTarget);
 const kmh=Math.round(Math.abs(speed)*3.6);$('#speed').textContent=String(kmh).padStart(3,'0');$('#speed-fill').style.width=`${Math.min(100,kmh/activeDef.speed*100)}%`;
 const garageDistance=player.position.distanceTo(new THREE.Vector3(garageX,0,garageZ));prompt.classList.toggle('hidden',garageDistance>19);
 const district=player.position.z>100?'HARBOR FRONT':player.position.x>90?'PALM HEIGHTS':player.position.z< -100?'OLD TOWN':'SUNSET DISTRICT';$('#district').textContent=district;
}
let elapsed=0;
function frame(){requestAnimationFrame(frame);const dt=Math.min(.04,clock.getDelta());elapsed+=dt;
 if(!started){const orbit=elapsed*.035;camera.position.lerp(new THREE.Vector3(12+Math.sin(orbit)*2,7.8,-15),.015);camera.lookAt(0,2,8);}
 else updateGame(dt);
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('#toast').classList.remove('show');}
 renderer.render(scene,camera);
}
frame();
window.addEventListener('load',()=>setTimeout(()=>$('#loading').classList.add('done'),450));

