FROM node:10.19-buster as build-stage

ENV VERSION 1.16.2

WORKDIR /tmp/gstreamer

RUN echo "deb http://ftp.fr.debian.org/debian/ buster contrib non-free" >> /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y build-essential dpkg-dev flex bison autotools-dev automake liborc-dev autopoint libtool \
                       gtk-doc-tools libxv-dev libasound2-dev libtheora-dev libogg-dev libvorbis-dev \
                       libbz2-dev libv4l-dev libvpx-dev libjack-jackd2-dev libsoup2.4-dev libpulse-dev faad libfaad-dev \
                       libfaac-dev libx264-dev libmad0-dev libx11-dev xorg-dev freeglut3-dev libglew1.5 libglew1.5-dev \
                       libglu1-mesa libglu1-mesa-dev libgl1-mesa-glx libgl1-mesa-dev libgles2-mesa-dev libreadline-dev \
                       libopus-dev libvisual-0.4-dev libpango1.0-dev libcdparanoia-dev libwavpack-dev libspeex-dev \
                       libjpeg-dev libdv-dev libcairo-dev yasm nasm liblzma-dev libgraphene-1.0-dev libxml2-dev \
                       zlib1g-dev libglib2.0-dev libgudev-1.0-dev libxt-dev iso-codes libgtk-3-dev libraw1394-dev \
                       libavc1394-dev libcairo2-dev libcaca-dev libpng-dev libshout3-dev libaa1-dev libflac-dev libdv4-dev \
                       libtag1-dev libcdaudio-dev libdc1394-22-dev ladspa-sdk libass-dev libcurl4-gnutls-dev libdca-dev \
                       libdvdnav-dev libexempi-dev libexif-dev libgme-dev libgsm1-dev libiptcdata0-dev libkate-dev \
                       libmms-dev libmodplug-dev libmpcdec-dev libofa0-dev libopus-dev librsvg2-dev librtmp-dev libmimic-dev \
                       libiec61883-dev libsndfile1-dev libsoundtouch-dev libspandsp-dev libxvidcore-dev libzbar-dev libzvbi-dev \
                       liba52-0.7.4-dev libcdio-dev libdvdread-dev libmp3lame-dev libmpeg2-4-dev libopencore-amrnb-dev \
                       libgirepository1.0-dev libopencore-amrwb-dev libsidplay1-dev libtwolame-dev libusb-1.0 python3 \
                       python-gi-dev python3-dev libudev-dev libdrm-dev libschroedinger-maeparser-dev libva-dev \
                       libfreetype6-dev libsdl1.2-dev libvdpau-dev libxcb1-dev libxcb-shm0-dev libxcb-xfixes0-dev texinfo zlib1g-dev \
                       libfdk-aac-dev libfftw3-dev libpostproc-dev libopenjp2-7-dev libavfilter-dev libvo-aacenc-dev \
                       libfontconfig-dev frei0r-plugins-dev libavresample-dev libssl-dev gettext libde265-dev libsrtp2-dev \
                       x265 x264

RUN curl -o gstreamer-${VERSION}.tar.xz https://gstreamer.freedesktop.org/src/gstreamer/gstreamer-${VERSION}.tar.xz && \
    curl -o gst-plugins-base-${VERSION}.tar.xz https://gstreamer.freedesktop.org/src/gst-plugins-base/gst-plugins-base-${VERSION}.tar.xz && \
    curl -o gst-plugins-good-${VERSION}.tar.xz https://gstreamer.freedesktop.org/src/gst-plugins-good/gst-plugins-good-${VERSION}.tar.xz && \
    curl -o gst-plugins-bad-${VERSION}.tar.xz https://gstreamer.freedesktop.org/src/gst-plugins-bad/gst-plugins-bad-${VERSION}.tar.xz && \
    curl -o gst-plugins-ugly-${VERSION}.tar.xz https://gstreamer.freedesktop.org/src/gst-plugins-ugly/gst-plugins-ugly-${VERSION}.tar.xz && \
    curl -o gst-libav-${VERSION}.tar.xz https://gstreamer.freedesktop.org/src/gst-libav/gst-libav-${VERSION}.tar.xz && \
    curl -o gstreamer-vaapi-${VERSION}.tar.xz https://gstreamer.freedesktop.org/src/gstreamer-vaapi/gstreamer-vaapi-${VERSION}.tar.xz

RUN tar -xJf gstreamer-${VERSION}.tar.xz && \
    tar -xJf gst-plugins-base-${VERSION}.tar.xz && \
    tar -xJf gst-plugins-good-${VERSION}.tar.xz && \
    tar -xJf gst-plugins-bad-${VERSION}.tar.xz && \
    tar -xJf gst-plugins-ugly-${VERSION}.tar.xz && \
    tar -xJf gst-libav-${VERSION}.tar.xz && \
    tar -xJf gstreamer-vaapi-${VERSION}.tar.xz && \
    rm *.tar.xz

ENV PKG_CONFIG_PATH /usr/lib/pkgconfig
ENV GS_OUT_PATH /usr/

# build gstreamer
RUN cd gstreamer-${VERSION} && \
    ./autogen.sh --prefix=$GS_OUT_PATH --disable-gtk-doc && \
    make && \
    make install && \
    cd ../gst-plugins-base-${VERSION} && \
    ./autogen.sh --prefix=$GS_OUT_PATH --disable-gtk-doc && \
    make && \
    make install && \
    cd ../gst-plugins-good-${VERSION} && \
    ./autogen.sh --prefix=$GS_OUT_PATH --disable-gtk-doc && \
    make && \
    make install && \
    cd ../gst-plugins-bad-${VERSION} && \
    ./autogen.sh --disable-gtk-doc --prefix=$GS_OUT_PATH && \
    make && \
    make install && \
    cd ../gst-plugins-ugly-${VERSION} && \
    ./autogen.sh --prefix=$GS_OUT_PATH --disable-gtk-doc && \
    make && \
    make install && \
    cd ../gst-libav-${VERSION} && \
    ./autogen.sh --prefix=$GS_OUT_PATH --disable-gtk-doc && \
    make && \
    make install && \
    cd ../gstreamer-vaapi-${VERSION} && \
    ./autogen.sh --prefix=$GS_OUT_PATH --disable-gtk-doc && \
    make && \
    make install && \
    cd ../../ && \
    rm -rf gstreamer &&  \
    apt-get clean


ENV NODE_ENV production
ENV PORT 3000

#RUN apt-get update && apt-get install -y libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev gstreamer1.0-tools \
#    gstreamer1.0-libav gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly

COPY --chown=node:node "." "/home/node/server"


USER node
WORKDIR /home/node/server

RUN touch .env && \
    npm i

ENTRYPOINT [ "node", "./run.js" ]

CMD [ "server" ]
