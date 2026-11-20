import{it}from"./site-x0v5x8t1.js";import{w,V}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class dm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function fm(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",dm)}fm();
export{dm,fm};

//# debugId=08B140838728DA4E64756E2164756E21
//# sourceMappingURL=site-gemek76s.js.map
