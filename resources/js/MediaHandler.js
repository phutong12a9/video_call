
   export const openUserStream = () => {
        const config = {video:true, audio:true}
        return navigator.mediaDevices.getUserMedia(config)
    }
   export const openDisplayStream = (video,audio) => {
    const config = {video:true, audio:true}
        return navigator.mediaDevices.getDisplayMedia(config)
    }